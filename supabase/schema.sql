-- Rotation — schéma Supabase
-- À exécuter dans l'éditeur SQL du projet Supabase (Dashboard > SQL Editor)

create extension if not exists "pgcrypto";

-- ============================================================
-- groups
-- ============================================================
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  settings jsonb not null default '{}'::jsonb,
  discord_guild_id text,
  discord_channel_id text,
  created_at timestamptz not null default now()
);

alter table groups add column if not exists discord_guild_id text;
alter table groups add column if not exists discord_channel_id text;

-- Empêche deux groupes Rotation de pointer sur le même salon Discord.
create unique index if not exists idx_groups_discord_channel
  on groups(discord_guild_id, discord_channel_id)
  where discord_channel_id is not null;

-- ============================================================
-- users — compte global (email + mot de passe), au-dessus des
-- membres. Un `user` peut être lié à plusieurs `members` (un par
-- groupe) via members.user_id, ce qui permet à terme à une même
-- personne d'appartenir à plusieurs groupes sous un seul identifiant.
-- Les membres sans compte lié (user_id null) continuent de
-- fonctionner à l'identique (pseudo + mot de passe propre au groupe).
-- ============================================================
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  email_verified_at timestamptz,
  email_verify_token uuid,
  failed_login_attempts int not null default 0,
  login_locked_until timestamptz,
  password_reset_token uuid,
  password_reset_expires_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_users_email on users (lower(email));

alter table users add column if not exists password_reset_token uuid;
alter table users add column if not exists password_reset_expires_at timestamptz;
create index if not exists idx_users_password_reset_token
  on users(password_reset_token) where password_reset_token is not null;

-- ============================================================
-- members
-- ============================================================
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  pseudo text not null,
  avatar_emoji text not null,
  avatar_color text not null,
  token uuid not null unique default gen_random_uuid(),
  is_admin boolean not null default false,
  is_active boolean not null default true,
  is_owner boolean not null default false,
  approval_status text not null default 'approved' check (approval_status in ('pending', 'approved')),
  password_hash text,
  failed_login_attempts int not null default 0,
  login_locked_until timestamptz,
  email text,
  email_verified_at timestamptz,
  email_verify_token uuid,
  last_seen_at timestamptz,
  discord_user_id text,
  discord_username text,
  discord_link_state uuid,
  discord_link_state_expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (group_id, pseudo)
);

-- Pour les bases déjà créées avant l'ajout de ces champs : `create table if not exists`
-- ne modifie pas une table existante, il faut donc les ajouter explicitement.
alter table members add column if not exists is_active boolean not null default true;
alter table members add column if not exists password_hash text;
alter table members add column if not exists is_owner boolean not null default false;
alter table members add column if not exists approval_status text not null default 'approved' check (approval_status in ('pending', 'approved'));
alter table members add column if not exists failed_login_attempts int not null default 0;
alter table members add column if not exists login_locked_until timestamptz;
alter table members add column if not exists email text;
alter table members add column if not exists email_verified_at timestamptz;
alter table members add column if not exists email_verify_token uuid;
alter table members add column if not exists last_seen_at timestamptz;
alter table members add column if not exists discord_user_id text;
alter table members add column if not exists discord_username text;
alter table members add column if not exists discord_link_state uuid;
alter table members add column if not exists discord_link_state_expires_at timestamptz;
alter table members add column if not exists user_id uuid references users(id) on delete set null;

create unique index if not exists idx_members_group_user
  on members(group_id, user_id) where user_id is not null;

create index if not exists idx_members_approval_status on members(approval_status);
create index if not exists idx_members_email_verify_token on members(email_verify_token);

create index if not exists idx_members_token on members(token);
create index if not exists idx_members_group_id on members(group_id);

-- Un compte Discord donné ne peut être lié qu'à un seul membre par groupe.
create unique index if not exists idx_members_group_discord_user
  on members(group_id, discord_user_id)
  where discord_user_id is not null;

create index if not exists idx_members_discord_link_state
  on members(discord_link_state)
  where discord_link_state is not null;

-- ============================================================
-- items — registre permanent par membre
-- ============================================================
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  spotify_id text not null,
  spotify_url text not null,
  type text not null check (type in ('track', 'album', 'artist')),
  title text not null,
  artist_name text,
  artwork_url text,
  genres text[] not null default '{}',
  first_added_at timestamptz not null default now(),
  unique (member_id, spotify_id)
);

-- Pour les bases déjà créées avant l'ajout de ce champ.
alter table items add column if not exists genres text[] not null default '{}';

create index if not exists idx_items_member_id on items(member_id);
create index if not exists idx_items_genres on items using gin(genres);

-- ============================================================
-- shares — slots actifs
-- ============================================================
create table if not exists shares (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  item_id uuid not null references items(id) on delete cascade,
  rank int not null,
  note text,
  added_at timestamptz not null default now(),
  unique (member_id, rank)
);

create index if not exists idx_shares_member_id on shares(member_id);
create index if not exists idx_shares_item_id on shares(item_id);

-- ============================================================
-- reactions
-- ============================================================
create table if not exists reactions (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references shares(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (share_id, member_id, emoji)
);

create index if not exists idx_reactions_share_id on reactions(share_id);

-- ============================================================
-- ratings — notes /10 entre membres, portent sur l'item permanent
-- (pas sur le share/slot) pour survivre à un remplacement et
-- alimenter un palmarès historisé.
-- ============================================================
create table if not exists ratings (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  rater_member_id uuid not null references members(id) on delete cascade,
  score int not null check (score >= 0 and score <= 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, rater_member_id)
);

create index if not exists idx_ratings_item_id on ratings(item_id);

-- ============================================================
-- share_events — journal append-only de chaque placement d'un
-- item dans un slot (ajout ou remplacement). Contrairement à
-- `shares` (mutable, un remplacement écrase la ligne), cette
-- table n'est jamais mise à jour ni vidée : c'est la source de
-- vérité pour l'historique "qui a partagé quoi, quand".
-- ============================================================
create table if not exists share_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  item_id uuid not null references items(id) on delete cascade,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_share_events_member_id on share_events(member_id);
create index if not exists idx_share_events_item_id on share_events(item_id);
create index if not exists idx_share_events_occurred_at on share_events(occurred_at desc);

-- ============================================================
-- comments — fil de discussion persistant par item (comme les
-- notes /10, survit aux repartages). `share_id` référence le
-- partage actif au moment du commentaire, pour tracer d'où il
-- provient sans perdre le commentaire si ce partage est retiré.
-- ============================================================
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  share_id uuid references shares(id) on delete set null,
  member_id uuid not null references members(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_comments_item_id on comments(item_id);

-- ============================================================
-- favorites — liste personnelle par membre, privée (visible
-- seulement par son propriétaire).
-- ============================================================
create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  item_id uuid not null references items(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (member_id, item_id)
);

create index if not exists idx_favorites_member_id on favorites(member_id);

-- ============================================================
-- group_messages — messages libres du chat de groupe, non liés à un
-- morceau (contrairement à `comments`, qui restent rattachés à un item).
-- ============================================================
create table if not exists group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_group_messages_group_id on group_messages(group_id);

-- ============================================================
-- push_subscriptions — abonnements Web Push (VAPID). Un membre peut avoir
-- plusieurs abonnements (un par appareil/navigateur).
-- ============================================================
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_member_id on push_subscriptions(member_id);

-- ============================================================
-- audit_log — journal des actions des utilisateurs, visible
-- seulement par le super-admin. `member_pseudo` est un instantané
-- au moment de l'action : `member_id`/`group_id` passent à null si
-- le membre ou le groupe est supprimé plus tard, mais le journal
-- doit rester lisible.
-- ============================================================
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete set null,
  member_id uuid references members(id) on delete set null,
  member_pseudo text,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_group_id on audit_log(group_id);
create index if not exists idx_audit_log_created_at on audit_log(created_at desc);

-- ============================================================
-- super_admins — compte(s) plateforme, indépendants des groupes,
-- avec contrôle total sur tous les groupes (tableau de bord /admin).
-- Bootstrap unique : POST /api/admin/setup ne fonctionne que si
-- cette table est vide, aucune inscription libre ensuite.
-- ============================================================
create table if not exists super_admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_super_admins_token on super_admins(token);

-- ============================================================
-- engagement_events — événements d'engagement (écoutes), volontairement
-- génériques mais bornés : uniquement des interactions de consommation,
-- pas un remplacement de share_events (partage) ni de audit_log (admin).
-- ============================================================
create table if not exists engagement_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  item_id uuid not null references items(id) on delete cascade,
  event_type text not null check (event_type in ('listen')),
  created_at timestamptz not null default now()
);

create index if not exists idx_engagement_events_item_id on engagement_events(item_id);
create index if not exists idx_engagement_events_member_id on engagement_events(member_id);
create index if not exists idx_engagement_events_created_at on engagement_events(created_at desc);

-- ============================================================
-- sessions — sessions révocables, remplacement progressif de
-- members.token / super_admins.token. token_hash = sha256 hex du
-- token opaque ; le token en clair n'est jamais stocké en base.
-- Les colonnes members.token / super_admins.token restent en place
-- pour l'instant (compatibilité transitoire) — suppression prévue
-- dans une migration ultérieure une fois la bascule validée.
-- ============================================================
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  super_admin_id uuid references super_admins(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint sessions_exactly_one_identity check (
    (case when member_id is not null then 1 else 0 end) +
    (case when super_admin_id is not null then 1 else 0 end) +
    (case when user_id is not null then 1 else 0 end) = 1
  )
);

create index if not exists idx_sessions_member_id on sessions(member_id);
create index if not exists idx_sessions_super_admin_id on sessions(super_admin_id);

alter table sessions add column if not exists user_id uuid references users(id) on delete cascade;
create index if not exists idx_sessions_user_id on sessions(user_id);

-- Pour les bases déjà créées avant l'ajout de user_id : le check ci-dessus
-- (défini dans le create table) ne s'applique pas à une table déjà
-- existante. On retrouve dynamiquement l'ancien check à 2 colonnes (nom non
-- supposé, généré par Postgres) et on le remplace par la version à 3
-- colonnes — même pattern que shares_member_rank_key plus bas.
do $$
declare
  v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = 'sessions'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%member_id%super_admin_id%'
    and pg_get_constraintdef(oid) not like '%user_id%';

  if v_conname is not null then
    execute format('alter table sessions drop constraint %I', v_conname);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'sessions'::regclass and conname = 'sessions_exactly_one_identity'
  ) then
    execute 'alter table sessions add constraint sessions_exactly_one_identity check (
      (case when member_id is not null then 1 else 0 end) +
      (case when super_admin_id is not null then 1 else 0 end) +
      (case when user_id is not null then 1 else 0 end) = 1
    )';
  end if;
end $$;

-- ============================================================
-- Fonctions RPC (atomicité) — toutes les écritures multi-étapes
-- passent par ces fonctions security definer, appelées via
-- supabaseAdmin.rpc(...). Une transaction par fonction.
-- ============================================================

-- Rend la contrainte unique(member_id, rank) de `shares` deferrable :
-- indispensable pour recompacter/réordonner les rangs en une seule
-- opération (ex. échanger les rangs 2 et 4) sans violation transitoire,
-- Postgres vérifiant les contraintes immédiates après CHAQUE ligne
-- modifiée dans un UPDATE multi-lignes, pas seulement à la fin.
-- Le nom exact de la contrainte n'est pas supposé : on le retrouve
-- dynamiquement via pg_constraint pour rester idempotent quel que
-- soit son nom actuel.
do $$
declare
  v_conname text;
  v_is_deferrable boolean;
begin
  select conname, condeferrable into v_conname, v_is_deferrable
  from pg_constraint
  where conrelid = 'shares'::regclass
    and contype = 'u'
    and pg_get_constraintdef(oid) like 'UNIQUE (member_id, rank)%';

  if v_conname is not null and not v_is_deferrable then
    execute format('alter table shares drop constraint %I', v_conname);
    execute 'alter table shares add constraint shares_member_rank_key unique (member_id, rank) deferrable initially deferred';
  elsif v_conname is null then
    execute 'alter table shares add constraint shares_member_rank_key unique (member_id, rank) deferrable initially deferred';
  end if;
end $$;

-- create_group_with_owner — crée le groupe puis son membre owner dans
-- la même transaction. Un conflit sur groups.code remonte l'exception
-- telle quelle (le TS retente avec un nouveau code). p_user_id (optionnel)
-- lie directement le membre owner à un compte utilisateur existant.
--
-- Changement de signature (ajout de p_user_id) : `create or replace`
-- n'autorisant pas un changement de liste de paramètres, l'ancienne
-- version à 7 arguments doit être supprimée en premier.
drop function if exists create_group_with_owner(text, text, jsonb, text, text, text, text);

create or replace function create_group_with_owner(
  p_name text,
  p_code text,
  p_settings jsonb,
  p_pseudo text,
  p_avatar_emoji text,
  p_avatar_color text,
  p_password_hash text,
  p_user_id uuid default null
) returns table (group_id uuid, member_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_member_id uuid;
begin
  insert into groups (name, code, settings)
  values (p_name, p_code, p_settings)
  returning id into v_group_id;

  insert into members (group_id, pseudo, avatar_emoji, avatar_color, is_admin, is_owner, password_hash, user_id)
  values (v_group_id, p_pseudo, p_avatar_emoji, p_avatar_color, true, true, p_password_hash, p_user_id)
  returning id into v_member_id;

  return query select v_group_id, v_member_id;
end;
$$;

-- place_share — ajoute ou remplace un partage de façon atomique.
-- pg_advisory_xact_lock sérialise les appels pour un même membre
-- (relâché automatiquement à la fin de la transaction) : deux ajouts
-- simultanés ne peuvent plus tous les deux lire "slot 1 libre" et se
-- marcher dessus — le second voit l'état à jour laissé par le premier.
create or replace function place_share(
  p_member_id uuid,
  p_item_id uuid,
  p_note text,
  p_replace_rank int,
  p_max_slots int
) returns table (out_rank int, out_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share_id uuid;
  v_free_rank int;
begin
  perform pg_advisory_xact_lock(hashtext(p_member_id::text)::bigint);

  if p_replace_rank is not null then
    select id into v_share_id from shares
      where member_id = p_member_id and rank = p_replace_rank;

    if v_share_id is null then
      return query select null::int, 'slot_missing'::text;
      return;
    end if;

    update shares set item_id = p_item_id, note = p_note, added_at = now()
      where id = v_share_id;

    -- share_events est un historique secondaire : un échec ici ne doit jamais faire
    -- échouer le partage lui-même (même principe qu'en TS avant la bascule RPC).
    begin
      insert into share_events (member_id, item_id) values (p_member_id, p_item_id);
    exception when others then
      raise warning 'share_events insert failed: %', sqlerrm;
    end;

    return query select p_replace_rank, 'ok'::text;
    return;
  end if;

  select min(r) into v_free_rank
    from generate_series(1, p_max_slots) r
    where r not in (select rank from shares where member_id = p_member_id);

  if v_free_rank is null then
    return query select null::int, 'slots_full'::text;
    return;
  end if;

  insert into shares (member_id, item_id, rank, note)
    values (p_member_id, p_item_id, v_free_rank, p_note);

  begin
    insert into share_events (member_id, item_id) values (p_member_id, p_item_id);
  exception when others then
    raise warning 'share_events insert failed: %', sqlerrm;
  end;

  return query select v_free_rank, 'ok'::text;
end;
$$;

-- delete_share_compact — supprime un partage et recompacte les rangs
-- supérieurs en une passe (contrainte deferrable ci-dessus).
create or replace function delete_share_compact(p_share_id uuid, p_member_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rank int;
begin
  perform pg_advisory_xact_lock(hashtext(p_member_id::text)::bigint);

  select rank into v_rank from shares where id = p_share_id and member_id = p_member_id;

  if v_rank is null then
    return false;
  end if;

  delete from shares where id = p_share_id;

  update shares set rank = rank - 1
    where member_id = p_member_id and rank > v_rank;

  return true;
end;
$$;

-- reorder_shares — réattribue rank = position dans le tableau fourni,
-- après vérification que celui-ci contient exactement le même ensemble
-- de shares que ceux du membre (ni plus, ni moins, pas de doublon).
create or replace function reorder_shares(p_member_id uuid, p_share_ids uuid[])
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_sorted uuid[];
  v_new_sorted uuid[];
begin
  perform pg_advisory_xact_lock(hashtext(p_member_id::text)::bigint);

  select coalesce(array_agg(id order by id), '{}') into v_current_sorted
    from shares where member_id = p_member_id;

  select coalesce(array_agg(x order by x), '{}') into v_new_sorted
    from unnest(p_share_ids) as x;

  if v_current_sorted is distinct from v_new_sorted then
    return false;
  end if;

  update shares s
    set rank = t.new_rank
    from unnest(p_share_ids) with ordinality as t(id, new_rank)
    where s.id = t.id and s.member_id = p_member_id;

  return true;
end;
$$;

-- apply_slot_reduction — supprime, pour chaque membre du groupe, les
-- shares dont le rang dépasse la nouvelle limite, et retourne l'impact
-- réel par membre.
create or replace function apply_slot_reduction(p_group_id uuid, p_new_slots int)
returns table (member_id uuid, pseudo text, shares_archived int)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    with deleted as (
      delete from shares s
      using members m
      where s.member_id = m.id
        and m.group_id = p_group_id
        and s.rank > p_new_slots
      returning s.member_id as deleted_member_id
    )
    select m.id, m.pseudo, count(d.deleted_member_id)::int
    from members m
    join deleted d on d.deleted_member_id = m.id
    where m.group_id = p_group_id
    group by m.id, m.pseudo;
end;
$$;

grant execute on function create_group_with_owner(text, text, jsonb, text, text, text, text, uuid) to service_role;
grant execute on function place_share(uuid, uuid, text, int, int) to service_role;
grant execute on function delete_share_compact(uuid, uuid) to service_role;
grant execute on function reorder_shares(uuid, uuid[]) to service_role;
grant execute on function apply_slot_reduction(uuid, int) to service_role;

-- ============================================================
-- Row Level Security
-- Toutes les écritures et lectures passent par les routes API
-- Next.js côté serveur (client Supabase avec la clé service_role,
-- jamais exposée au navigateur). RLS est activé mais aucune policy
-- publique n'est définie : la clé anon ne peut rien lire ni écrire.
-- ============================================================
alter table groups enable row level security;
alter table members enable row level security;
alter table items enable row level security;
alter table shares enable row level security;
alter table reactions enable row level security;
alter table ratings enable row level security;
alter table share_events enable row level security;
alter table super_admins enable row level security;
alter table comments enable row level security;
alter table favorites enable row level security;
alter table audit_log enable row level security;
alter table engagement_events enable row level security;
alter table sessions enable row level security;
alter table group_messages enable row level security;
alter table push_subscriptions enable row level security;
alter table users enable row level security;
