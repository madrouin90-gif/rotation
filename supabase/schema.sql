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
  created_at timestamptz not null default now()
);

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

create index if not exists idx_members_approval_status on members(approval_status);
create index if not exists idx_members_email_verify_token on members(email_verify_token);

create index if not exists idx_members_token on members(token);
create index if not exists idx_members_group_id on members(group_id);

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
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (
    (member_id is not null and super_admin_id is null) or
    (member_id is null and super_admin_id is not null)
  )
);

create index if not exists idx_sessions_member_id on sessions(member_id);
create index if not exists idx_sessions_super_admin_id on sessions(super_admin_id);

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
