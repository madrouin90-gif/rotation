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
  password_hash text,
  created_at timestamptz not null default now(),
  unique (group_id, pseudo)
);

-- Pour les bases déjà créées avant l'ajout de ces champs : `create table if not exists`
-- ne modifie pas une table existante, il faut donc les ajouter explicitement.
alter table members add column if not exists is_active boolean not null default true;
alter table members add column if not exists password_hash text;

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
