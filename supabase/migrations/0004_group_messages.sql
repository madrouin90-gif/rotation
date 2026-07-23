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

alter table group_messages enable row level security;
