import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AppError, errorResponse } from "@/lib/errors";
import { normalizeGroupCode } from "@/lib/codes";
import { verifyPassword } from "@/lib/password";

interface LoginBody {
  pseudo?: string;
  password?: string;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await params;
    const code = normalizeGroupCode(rawCode);
    const body = (await request.json()) as LoginBody;
    const pseudo = body.pseudo?.trim() ?? "";
    const password = body.password ?? "";

    if (!pseudo || !password) {
      throw new AppError("Entre ton pseudo et ton mot de passe.");
    }

    const { data: group, error: groupError } = await supabaseAdmin
      .from("groups")
      .select("id, name, code")
      .eq("code", code)
      .maybeSingle();

    if (groupError || !group) {
      throw new AppError("Ce code de groupe n'existe pas. Vérifie qu'il est correctement saisi.", 404);
    }

    const { data: members, error: membersError } = await supabaseAdmin
      .from("members")
      .select("id, token, pseudo, password_hash, is_active, failed_login_attempts, login_locked_until")
      .eq("group_id", group.id);

    if (membersError || !members) {
      throw new AppError("Impossible de vérifier les membres du groupe.", 500);
    }

    const member = members.find((m) => m.pseudo.toLowerCase() === pseudo.toLowerCase());

    if (member?.login_locked_until && new Date(member.login_locked_until).getTime() > Date.now()) {
      throw new AppError("Trop de tentatives. Réessaie dans quelques minutes.", 429);
    }

    const passwordOk = Boolean(member?.password_hash) && (await verifyPassword(password, member!.password_hash!));

    if (!member || !passwordOk) {
      if (member) {
        const attempts = member.failed_login_attempts + 1;
        const update: { failed_login_attempts: number; login_locked_until?: string } = {
          failed_login_attempts: attempts,
        };
        if (attempts >= MAX_FAILED_ATTEMPTS) {
          update.login_locked_until = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString();
        }
        await supabaseAdmin.from("members").update(update).eq("id", member.id);
      }
      throw new AppError("Pseudo ou mot de passe incorrect.", 401);
    }

    if (!member.is_active) {
      throw new AppError("Ce profil a été désactivé par l'admin du groupe.", 401);
    }

    if (member.failed_login_attempts > 0 || member.login_locked_until) {
      await supabaseAdmin
        .from("members")
        .update({ failed_login_attempts: 0, login_locked_until: null })
        .eq("id", member.id);
    }

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
