import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import type { Group } from "@/types";
import { mergeSettings } from "@/lib/settings";
import { createMemberSession, findMemberSession } from "@/lib/sessions";

export const MEMBER_TOKEN_HEADER = "x-member-token";

export interface AuthedMember {
  id: string;
  group_id: string;
  pseudo: string;
  avatar_emoji: string;
  avatar_color: string;
  is_admin: boolean;
  is_owner: boolean;
}

/** Récupère le membre authentifié via le header x-member-token. Ne vérifie pas encore l'appartenance à un groupe précis. */
export async function requireMember(request: Request): Promise<AuthedMember> {
  const token = request.headers.get(MEMBER_TOKEN_HEADER);
  if (!token) {
    throw new AppError("Authentification manquante. Rejoins ou recrée ton profil dans ce groupe.", 401);
  }

  let data = await findMemberSession(token);

  if (!data) {
    // Compatibilité transitoire (retirée dans une migration ultérieure une fois validée) :
    // les sessions créées avant l'introduction de la table `sessions` reposent encore sur
    // l'ancienne colonne members.token. On migre silencieusement en créant une session dont
    // le token_hash dérive de CE MÊME token — le client garde le même token en localStorage,
    // donc ses requêtes suivantes matcheront directement cette nouvelle session sans
    // redéclencher ce chemin de secours à chaque fois.
    const { data: legacy, error: legacyError } = await supabaseAdmin
      .from("members")
      .select("id, group_id, pseudo, avatar_emoji, avatar_color, is_admin, is_owner, is_active, approval_status")
      .eq("token", token)
      .maybeSingle();

    if (legacyError || !legacy) {
      throw new AppError("Session invalide ou expirée. Rejoins à nouveau le groupe.", 401);
    }

    // Best-effort : si la table `sessions` n'existe pas encore (migration pas encore
    // appliquée), on continue quand même avec les données legacy plutôt que de casser
    // toute authentification existante le temps que la migration soit exécutée.
    try {
      await createMemberSession(legacy.id, token);
    } catch (sessionError) {
      console.error("createMemberSession (migration transitoire) failed", sessionError);
    }
    data = legacy;
  }

  if (!data.is_active) {
    throw new AppError("Ce profil a été désactivé par l'admin du groupe.", 401);
  }

  if (data.approval_status !== "approved") {
    throw new AppError("Ta demande d'adhésion est en attente d'approbation par l'admin.", 401);
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

export async function requireOwnerInGroup(
  request: Request,
  groupCode: string
): Promise<{ member: AuthedMember; group: Group }> {
  const result = await requireMemberInGroup(request, groupCode);
  if (!result.member.is_owner) {
    throw new AppError("Seul le créateur du groupe peut effectuer cette action.", 403);
  }
  return result;
}
