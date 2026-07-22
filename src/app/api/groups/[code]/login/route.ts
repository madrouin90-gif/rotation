import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AppError, errorResponse } from "@/lib/errors";
import { normalizeGroupCode } from "@/lib/codes";
import { verifyPassword } from "@/lib/password";

interface LoginBody {
  pseudo?: string;
  password?: string;
}

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
      .select("id, token, pseudo, password_hash, is_active")
      .eq("group_id", group.id);

    if (membersError || !members) {
      throw new AppError("Impossible de vérifier les membres du groupe.", 500);
    }

    const member = members.find((m) => m.pseudo.toLowerCase() === pseudo.toLowerCase());

    if (!member || !member.password_hash || !(await verifyPassword(password, member.password_hash))) {
      throw new AppError("Pseudo ou mot de passe incorrect.", 401);
    }

    if (!member.is_active) {
      throw new AppError("Ce profil a été désactivé par l'admin du groupe.", 401);
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
