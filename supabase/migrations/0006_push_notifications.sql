-- ============================================================
-- Notifications push (Web Push / VAPID) : un membre peut avoir
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

alter table push_subscriptions enable row level security;

-- Note : settings.notification_events vit dans la colonne JSONB `groups.settings`
-- déjà existante — aucune migration de schéma nécessaire pour ce champ.
