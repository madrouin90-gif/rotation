-- ============================================================
-- 0008 — Mot de passe oublié (comptes utilisateur uniquement)
--
-- Volontairement limité aux comptes (users) : un ancien profil (members)
-- non lié à un compte n'a pas d'identité email fiable pour un reset (un
-- même email a pu être vérifié sur plusieurs profils, dans plusieurs
-- groupes, sans lien entre eux avant l'introduction des comptes).
-- ============================================================

alter table users add column if not exists password_reset_token uuid;
alter table users add column if not exists password_reset_expires_at timestamptz;
create index if not exists idx_users_password_reset_token
  on users(password_reset_token) where password_reset_token is not null;
