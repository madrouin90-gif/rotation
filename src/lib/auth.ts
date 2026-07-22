import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import type { Group } from "@/types";
import { mergeSettings } from "@/lib/settings";

export const MEMBER_TOKEN_HEADER = "x-member-token";

export interface AuthedMember {
  id: string;
  group_id: string;
  pseudo: string;
  avatar_emoji: string;
  avatar_color: string;
  is_admin: boolean;
}

/** Récupère le membre authentifié via le header x-member-token. Ne vérifie pas encore l'appartenance à un groupe précis. */
export async function requireMember(request: Request): Promise<AuthedMember> {
  const token = request.headers.get(MEMBER_TOKEN_HEADER);
  if (!token) {
    throw new AppError("Authentification manquante. Rejoins ou recrée ton profil dans ce groupe.", 401);
  }

  const { data, error } = await supabaseAdmin
    .from("members")
    .select("id, group_id, pseudo, avatar_emoji, avatar_color, is_admin")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) {
    throw new AppError("Session invalide ou expirée. Rejoins à nouveau le groupe.", 401);
  }

  return data;
}

/** Vérifie que le membre authentifié appartient bien au groupe identifié par son code. */
export async function requireMemberInGroup(
  request: Request,
  groupCode: string
): Promise<{ member: AuthedMember; group: Group }> {
  const member = await requireMember(request);

  const { data: groupRow, error } = await supabaseAdmin
    .from("groups")
    .select("id, name, code, settings, created_at")
    .eq("code", groupCode)
    .maybeSingle();

  if (error || !groupRow) {
    throw new AppError("Ce groupe n'existe pas ou plus.", 404);
  }

  if (member.group_id !== groupRow.id) {
    throw new AppError("Tu n'as pas accès à ce groupe.", 403);
  }

  const group: Group = { ...groupRow, settings: mergeSettings(groupRow.settings) };
  return { member, group };
}

export async function requireAdminInGroup(
  request: Request,
  groupCode: string
): Promise<{ member: AuthedMember; group: Group }> {
  const result = await requireMemberInGroup(request, groupCode);
  if (!result.member.is_admin) {
    throw new AppError("Seul l'admin du groupe peut effectuer cette action.", 403);
  }
  return result;
}
