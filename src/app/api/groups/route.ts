import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AppError, errorResponse } from "@/lib/errors";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { generateGroupCode } from "@/lib/codes";
import { isValidAvatarColor, isValidAvatarEmoji } from "@/lib/avatars";
import { hashPassword } from "@/lib/password";
import { logAction } from "@/lib/auditLog";

interface CreateGroupBody {
  groupName?: string;
  pseudo?: string;
  avatarEmoji?: string;
  avatarColor?: string;
  password?: string;
  isPublic?: boolean;
  requireApproval?: boolean;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateGroupBody;
    const groupName = body.groupName?.trim() ?? "";
    const pseudo = body.pseudo?.trim() ?? "";
    const avatarEmoji = body.avatarEmoji ?? "";
    const avatarColor = body.avatarColor ?? "";
    const password = body.password ?? "";

    if (groupName.length < 1 || groupName.length > 60) {
      throw new AppError("Le nom du groupe doit contenir entre 1 et 60 caractères.");
    }
    if (pseudo.length < 1 || pseudo.length > 24) {
      throw new AppError("Ton pseudo doit contenir entre 1 et 24 caractères.");
    }
    if (!isValidAvatarEmoji(avatarEmoji) || !isValidAvatarColor(avatarColor)) {
      throw new AppError("Choisis un avatar dans la palette proposée.");
    }
    if (password.length < 4 || password.length > 72) {
      throw new AppError("Ton mot de passe doit contenir entre 4 et 72 caractères.");
    }

    let code = "";
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = generateGroupCode();
      const { data: existing } = await supabaseAdmin.from("groups").select("id").eq("code", candidate).maybeSingle();
      if (!existing) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      throw new AppError("Impossible de générer un code de groupe unique, réessaie.", 500);
    }

    const settings = {
      ...DEFAULT_SETTINGS,
      is_public: Boolean(body.isPublic),
      require_approval: Boolean(body.requireApproval),
    };

    const { data: group, error: groupError } = await supabaseAdmin
      .from("groups")
      .insert({ name: groupName, code, settings })
      .select("id, name, code")
      .single();

    if (groupError || !group) {
      throw new AppError("Impossible de créer le groupe. Réessaie.", 500);
    }

    const passwordHash = await hashPassword(password);

    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .insert({
        group_id: group.id,
        pseudo,
        avatar_emoji: avatarEmoji,
        avatar_color: avatarColor,
        is_admin: true,
        is_owner: true,
        password_hash: passwordHash,
      })
      .select("id, token")
      .single();

    if (memberError || !member) {
      throw new AppError("Impossible de créer ton profil dans le groupe. Réessaie.", 500);
    }

    await logAction({
      groupId: group.id,
      memberId: member.id,
      memberPseudo: pseudo,
      action: "group_created",
      metadata: { groupName },
    });

    return NextResponse.json({
      token: member.token,
      memberId: member.id,
      groupCode: group.code,
      groupName: group.name,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
