import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";

export function sha256hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Best-effort, ne bloque jamais l'appelant sur une mise à jour de métadonnées secondaire. */
function touchLastUsed(sessionId: string) {
  void supabaseAdmin
    .from("sessions")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", sessionId)
    .then(
      () => {},
      () => {}
    );
}

export interface SessionMemberRow {
  id: string;
  group_id: string;
  pseudo: string;
  avatar_emoji: string;
  avatar_color: string;
  is_admin: boolean;
  is_owner: boolean;
  is_active: boolean;
  approval_status: "pending" | "approved";
}

export interface SessionSuperAdminRow {
  id: string;
  email: string;
}

export interface SessionUserRow {
  id: string;
  email: string;
  email_verified_at: string | null;
}

/**
 * `existingToken` permet de migrer silencieusement un ancien token en clair (members.token /
 * super_admins.token, colonnes retirées en phase 1.4) vers une session : on dérive le
 * `token_hash` du MÊME token déjà détenu par le client, pour que ses requêtes suivantes
 * matchent directement cette nouvelle session sans repasser par le chemin de secours.
 */
export async function createMemberSession(memberId: string, existingToken?: string): Promise<string> {
  const token = existingToken ?? generateOpaqueToken();
  const { error } = await supabaseAdmin
    .from("sessions")
    .insert({ member_id: memberId, token_hash: sha256hex(token) });
  if (error) throw error;
  return token;
}

export async function createSuperAdminSession(superAdminId: string, existingToken?: string): Promise<string> {
  const token = existingToken ?? generateOpaqueToken();
  const { error } = await supabaseAdmin
    .from("sessions")
    .insert({ super_admin_id: superAdminId, token_hash: sha256hex(token) });
  if (error) throw error;
  return token;
}

export async function createUserSession(userId: string, existingToken?: string): Promise<string> {
  const token = existingToken ?? generateOpaqueToken();
  const { error } = await supabaseAdmin
    .from("sessions")
    .insert({ user_id: userId, token_hash: sha256hex(token) });
  if (error) throw error;
  return token;
}

export async function findMemberSession(token: string): Promise<SessionMemberRow | null> {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select(
      "id, members(id, group_id, pseudo, avatar_emoji, avatar_color, is_admin, is_owner, is_active, approval_status)"
    )
    .eq("token_hash", sha256hex(token))
    .is("revoked_at", null)
    .not("member_id", "is", null)
    .maybeSingle();

  if (error || !data || !data.members) return null;

  touchLastUsed(data.id);
  return data.members as unknown as SessionMemberRow;
}

export async function findSuperAdminSession(token: string): Promise<SessionSuperAdminRow | null> {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("id, super_admins(id, email)")
    .eq("token_hash", sha256hex(token))
    .is("revoked_at", null)
    .not("super_admin_id", "is", null)
    .maybeSingle();

  if (error || !data || !data.super_admins) return null;

  touchLastUsed(data.id);
  return data.super_admins as unknown as SessionSuperAdminRow;
}

export async function findUserSession(token: string): Promise<SessionUserRow | null> {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("id, users(id, email, email_verified_at)")
    .eq("token_hash", sha256hex(token))
    .is("revoked_at", null)
    .not("user_id", "is", null)
    .maybeSingle();

  if (error || !data || !data.users) return null;

  touchLastUsed(data.id);
  return data.users as unknown as SessionUserRow;
}

/** Révoque toutes les sessions d'un membre, sauf éventuellement celle de la requête en cours. */
export async function revokeAllMemberSessions(memberId: string, exceptTokenHash?: string) {
  let query = supabaseAdmin
    .from("sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("member_id", memberId)
    .is("revoked_at", null);

  if (exceptTokenHash) {
    query = query.neq("token_hash", exceptTokenHash);
  }

  const { error } = await query;
  if (error) console.error("revokeAllMemberSessions failed", error);
}

export async function revokeSuperAdminSessionByToken(token: string) {
  const { error } = await supabaseAdmin
    .from("sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", sha256hex(token));
  if (error) console.error("revokeSuperAdminSessionByToken failed", error);
}
