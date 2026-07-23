import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AppError, errorResponse } from "@/lib/errors";
import { mergeSettings } from "@/lib/settings";
import { isValidAvatarColor, isValidAvatarEmoji } from "@/lib/avatars";
import { normalizeGroupCode } from "@/lib/codes";
import { hashPassword } from "@/lib/password";
import { logAction } from "@/lib/auditLog";
import { createMemberSession } from "@/lib/sessions";
import { enforceRateLimit } from "@/lib/rateLimit";

interface JoinBody {
  pseudo?: string;
  avatarEmoji?: string;
  avatarColor?: string;
  password?: string;
}

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    await enforceRateLimit(request, "join", 10, 10 * 60);

    const { code: rawCode } = await params;
    const code = normalizeGroupCode(rawCode);
    const body = (await request.json()) as JoinBody;
    const pseudo = body.pseudo?.trim() ?? "";
    const avatarEmoji = body.avatarEmoji ?? "";
    const avatarColor = body.avatarColor ?? "";
    const password = body.password ?? "";

    if (pseudo.length < 1 || pseudo.length > 24) {
      throw new AppError("Ton pseudo doit contenir entre 1 et 24 caractères.");
    }
    if (!isValidAvatarEmoji(avatarEmoji) || !isValidAvatarColor(avatarColor)) {
      throw new AppError("Choisis un avatar dans la palette proposée.");
    }
    if (password.length < 8 || password.length > 72) {
      throw new AppError("Ton mot de passe doit contenir entre 8 et 72 caractères.");
    }

    const { data: group, error: groupError } = await supabaseAdmin
      .from("groups")
      .select("id, name, code, settings")
      .eq("code", code)
      .maybeSingle();

    if (groupError || !group) {
      throw new AppError("Ce code de groupe n'existe pas. Vérifie qu'il est correctement saisi.", 404);
    }

    const settings = mergeSettings(group.settings);

    const { data: existingMembers, error: countError } = await supabaseAdmin
      .from("members")
      .select("id, pseudo, approval_status")
      .eq("group_id", group.id);

    if (countError || !existingMembers) {
      throw new AppError("Impossible de vérifier les membres du groupe.", 500);
    }

    const approvedCount = existingMembers.filter((m) => m.approval_status === "approved").length;
    if (approvedCount >= settings.max_members) {
      throw new AppError(
        `Ce groupe est déjà complet (maximum ${settings.max_members} membres).`
      );
    }

    const pseudoTaken = existingMembers.some((m) => m.pseudo.toLowerCase() === pseudo.toLowerCase());
    if (pseudoTaken) {
      throw new AppError("Ce pseudo est déjà pris dans ce groupe. Choisis-en un autre.");
    }

    const passwordHash = await hashPassword(password);
    const approvalStatus = settings.require_approval ? "pending" : "approved";

    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .insert({
        group_id: group.id,
        pseudo,
        avatar_emoji: avatarEmoji,
        avatar_color: avatarColor,
        is_admin: false,
        password_hash: passwordHash,
        approval_status: approvalStatus,
      })
      .select("id")
      .single();

    if (memberError || !member) {
      throw new AppError("Impossible de rejoindre le groupe. Réessaie.", 500);
    }

    await logAction({
      groupId: group.id,
      memberId: member.id,
      memberPseudo: pseudo,
      action: approvalStatus === "pending" ? "join_requested" : "member_joined",
    });

    const token = await createMemberSession(member.id);

    return NextResponse.json({
      token,
      memberId: member.id,
      groupCode: group.code,
      groupName: group.name,
      approvalStatus,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
