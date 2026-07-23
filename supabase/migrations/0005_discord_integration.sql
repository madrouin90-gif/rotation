-- ============================================================
-- Intégration Discord : un groupe peut être relié à un salon Discord
-- (partage automatique via bot), un membre peut lier son compte Discord
-- (OAuth2 identify) à son profil pour que le bot sache à qui attribuer
-- un lien Spotify posté dans ce salon.
-- ============================================================

alter table groups add column if not exists discord_guild_id text;
alter table groups add column if not exists discord_channel_id text;

-- Empêche deux groupes Rotation de pointer sur le même salon Discord
-- (ambiguïté impossible à résoudre côté bot).
create unique index if not exists idx_groups_discord_channel
  on groups(discord_guild_id, discord_channel_id)
  where discord_channel_id is not null;

alter table members add column if not exists discord_user_id text;
alter table members add column if not exists discord_username text;

-- `discord_link_state`/`discord_link_state_expires_at` : jeton éphémère du
-- flux OAuth2, même mécanique que `email_verify_token` — le state EST
-- l'authentification au retour de Discord (pas de header de session possible
-- sur une redirection complète du navigateur).
alter table members add column if not exists discord_link_state uuid;
alter table members add column if not exists discord_link_state_expires_at timestamptz;

create unique index if not exists idx_members_group_discord_user
  on members(group_id, discord_user_id)
  where discord_user_id is not null;

create index if not exists idx_members_discord_link_state
  on members(discord_link_state)
  where discord_link_state is not null;
