import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireMember, MEMBER_TOKEN_HEADER } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { logAction } from "@/lib/auditLog";
import { revokeAllMemberSessions, sha256hex } from "@/lib/sessions";

interface SetPasswordBody {
  password?: string;
}

export async function POST(request: Request) {
  try {
    const member = await requireMember(request);
    const body = (await request.json()) as SetPasswordBody;
    const password = body.password ?? "";

    if (password.length < 8 || password.length > 72) {
      throw new AppError("Ton mot de passe doit contenir entre 8 et 72 caractères.");
    }

    const passwordHash = await hashPassword(password);

    const { error } = await supabaseAdmin
      .from("members")
      .update({ password_hash: passwordHash })
      .eq("id", member.id);

    if (error) throw new AppError("Impossible d'enregistrer ton mot de passe.", 500);

    // Déconnecte tous les autres appareils/onglets ; garde la session courante active.
    const currentToken = request.headers.get(MEMBER_TOKEN_HEADER);
    await revokeAllMemberSessions(member.id, currentToken ? sha256hex(currentToken) : undefined);

    await logAction({
      groupId: member.group_id,
      memberId: member.id,
      memberPseudo: member.pseudo,
      action: "password_changed",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
