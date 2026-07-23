import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AppError, errorResponse } from "@/lib/errors";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { generateGroupCode } from "@/lib/codes";
import { isValidAvatarColor, isValidAvatarEmoji } from "@/lib/avatars";
import { hashPassword } from "@/lib/password";
import { logAction } from "@/lib/auditLog";
import { createMemberSession } from "@/lib/sessions";
import { enforceRateLimit } from "@/lib/rateLimit";

interface CreateGroupBody {
  groupName?: string;
  pseudo?: string;
  avatarEmoji?: string;
  avatarColor?: string;
  password?: string;
  isPublic?: boolean;
  requireApproval?: boolean;
}

interface CreateGroupWithOwnerResult {
  group_id: string;
  member_id: string;
}

const UNIQUE_VIOLATION = "23505";

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "create-group", 5, 60 * 60);

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
    if (password.length < 8 || password.length > 72) {
      throw new AppError("Ton mot de passe doit contenir entre 8 et 72 caractères.");
    }

    const settings = {
      ...DEFAULT_SETTINGS,
      is_public: Boolean(body.isPublic),
      require_approval: Boolean(body.requireApproval),
    };

    const passwordHash = await hashPassword(password);

    let created: CreateGroupWithOwnerResult | null = null;
    let code = "";

    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = generateGroupCode();
      const { data, error } = await supabaseAdmin
        .rpc("create_group_with_owner", {
          p_name: groupName,
          p_code: candidate,
          p_settings: settings,
          p_pseudo: pseudo,
          p_avatar_emoji: avatarEmoji,
          p_avatar_color: avatarColor,
          p_password_hash: passwordHash,
        })
        .single<CreateGroupWithOwnerResult>();

      if (!error && data) {
        created = data;
        code = candidate;
        break;
      }

      if (error && error.code !== UNIQUE_VIOLATION) {
        throw new AppError("Impossible de créer le groupe. Réessaie.", 500);
      }
      // Conflit sur le code : on boucle et réessaie avec un nouveau candidat.
    }

    if (!created) {
      throw new AppError("Impossible de générer un code de groupe unique, réessaie.", 500);
    }

    await logAction({
      groupId: created.group_id,
      memberId: created.member_id,
      memberPseudo: pseudo,
      action: "group_created",
      metadata: { groupName },
    });

    const token = await createMemberSession(created.member_id);

    return NextResponse.json({
      token,
      memberId: created.member_id,
      groupCode: code,
      groupName,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
