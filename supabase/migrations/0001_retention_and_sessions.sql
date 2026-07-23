-- ============================================================
-- 1. Canal de contact : email optionnel par membre
-- ============================================================
alter table members add column if not exists email text;
alter table members add column if not exists email_verified_at timestamptz;
alter table members add column if not exists email_verify_token uuid;
create index if not exists idx_members_email_verify_token on members(email_verify_token);

-- ============================================================
-- 2. Dernière visite (base du "X nouveautés depuis ta visite")
-- ============================================================
alter table members add column if not exists last_seen_at timestamptz;

-- ============================================================
-- 3. Événements d'engagement (écoutes, et extensible)
--    Volontairement générique mais borné : uniquement des types
--    d'interaction de consommation, PAS un remplacement de
--    share_events ni de audit_log.
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
alter table engagement_events enable row level security;

-- ============================================================
-- 4. Sessions révocables (remplace members.token / super_admins.token)
--    token_hash = sha256 hex du token opaque; le token en clair
--    n'est jamais stocké en base.
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
alter table sessions enable row level security;

-- NOTE : ne PAS supprimer members.token / super_admins.token dans cette
-- migration. Suppression prévue dans une migration ultérieure (0002),
-- après bascule complète du code et validation en conditions réelles.
