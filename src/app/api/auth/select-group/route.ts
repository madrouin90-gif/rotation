import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireUser } from "@/lib/userAuth";
import { AppError, errorResponse } from "@/lib/errors";
import { normalizeGroupCode } from "@/lib/codes";
import { createMemberSession } from "@/lib/sessions";

interface SelectGroupBody {
  groupCode?: string;
}

/**
 * Échange un token utilisateur contre un token de membre classique pour un groupe
 * donné — même mécanisme de session (`createMemberSession`) que le login/join par
 * groupe. À partir de là, tout le reste de l'app (partages, notes, commentaires...)
 * fonctionne exactement comme aujourd'hui, sans distinction compte/profil.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);

    const body = (await request.json()) as SelectGroupBody;
    const code = normalizeGroupCode(body.groupCode ?? "");

    const { data: group, error: groupError } = await supabaseAdmin
      .from("groups")
      .select("id, code, name")
      .eq("code", code)
      .maybeSingle();

    if (groupError || !group) {
      throw new AppError("Ce groupe n'existe pas ou plus.", 404);
    }

    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select("id, is_active, approval_status")
      .eq("group_id", group.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberError || !member) {
      throw new AppError("Tu n'as pas de profil dans ce groupe.", 404);
    }

    if (!member.is_active) {
      throw new AppError("Ce profil a été désactivé par l'admin du groupe.", 401);
    }

    if (member.approval_status !== "approved") {
      throw new AppError("Ta demande d'adhésion est en attente d'approbation par l'admin.", 401);
    }

    const token = await createMemberSession(member.id);

    return NextResponse.json({ token, memberId: member.id, groupCode: group.code, groupName: group.name });
  } catch (error) {
    return errorResponse(error);
  }
}
