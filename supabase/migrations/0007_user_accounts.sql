-- ============================================================
-- 0007 — Comptes utilisateur (email global, au-dessus des membres)
--
-- Objectif : permettre à terme à un même utilisateur d'appartenir à
-- plusieurs groupes sous un seul identifiant (email + mot de passe),
-- sans toucher à `member_id` qui reste la clé étrangère de toutes les
-- tables existantes (shares, items, reactions, ratings, comments,
-- favorites, push_subscriptions, engagement_events, share_events).
-- Un `user` peut être lié à plusieurs `members` (un par groupe) via
-- `members.user_id`. Aucune donnée existante n'est modifiée ; les
-- membres sans compte lié continuent de fonctionner exactement comme
-- avant (pseudo + mot de passe propre au groupe).
-- ============================================================

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  email_verified_at timestamptz,
  email_verify_token uuid,
  failed_login_attempts int not null default 0,
  login_locked_until timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_users_email on users (lower(email));
alter table users enable row level security;

alter table members add column if not exists user_id uuid references users(id) on delete set null;
create unique index if not exists idx_members_group_user
  on members(group_id, user_id) where user_id is not null;

alter table sessions add column if not exists user_id uuid references users(id) on delete cascade;
create index if not exists idx_sessions_user_id on sessions(user_id);

-- Remplace le check à 2 colonnes (exactement un de member_id/super_admin_id)
-- par une version à 3 colonnes incluant user_id (exactement un des trois).
-- Le nom du check n'est pas supposé (généré automatiquement par Postgres à
-- la création de la table) : on le retrouve dynamiquement via pg_constraint,
-- même pattern que shares_member_rank_key dans schema.sql.
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

-- create_group_with_owner change de signature (ajout de p_user_id) : on la
-- supprime d'abord, `create or replace` n'autorisant pas un changement de
-- liste de paramètres.
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

grant execute on function create_group_with_owner(text, text, jsonb, text, text, text, text, uuid) to service_role;
