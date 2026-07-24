import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { logAction } from "@/lib/auditLog";
import { createUserSession } from "@/lib/sessions";
import { enforceRateLimit } from "@/lib/rateLimit";

interface LinkBody {
  password?: string;
}

/**
 * Lie ce profil (membre) à un compte email, pour les membres existants ayant déjà un
 * email vérifié (via /api/account/email) mais créés avant l'introduction des comptes.
 * Ne fusionne jamais silencieusement avec un compte existant : si l'email est déjà pris
 * par un autre compte, on redirige vers la connexion plutôt que de lier automatiquement.
 */
export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "account-link", 5, 60 * 60);

    const member = await requireMember(request);
    const body = (await request.json()) as LinkBody;
    const password = body.password ?? "";

    const { data: memberRow, error: memberError } = await supabaseAdmin
      .from("members")
      .select("email, email_verified_at, user_id")
      .eq("id", member.id)
      .maybeSingle();

    if (memberError || !memberRow) {
      throw new AppError("Impossible de vérifier ton profil.", 500);
    }

    if (memberRow.user_id) {
      throw new AppError("Ce profil est déjà lié à un compte.");
    }

    if (!memberRow.email || !memberRow.email_verified_at) {
      throw new AppError("Tu dois d'abord ajouter et vérifier un courriel dans ton profil.");
    }

    if (password.length < 8 || password.length > 72) {
      throw new AppError("Ton mot de passe doit contenir entre 8 et 72 caractères.");
    }

    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", memberRow.email)
      .maybeSingle();

    if (existingUser) {
      throw new AppError(
        "Un compte existe déjà avec ce courriel — connecte-toi via ton compte plutôt que de lier ce profil.",
        409
      );
    }

    const passwordHash = await hashPassword(password);

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .insert({ email: memberRow.email, password_hash: passwordHash, email_verified_at: memberRow.email_verified_at })
      .select("id")
      .single();

    if (userError || !user) {
      throw new AppError("Impossible de créer le compte. Réessaie.", 500);
    }

    await supabaseAdmin.from("members").update({ user_id: user.id }).eq("id", member.id);

    await logAction({
      groupId: member.group_id,
      memberId: member.id,
      memberPseudo: member.pseudo,
      action: "account_linked",
    });

    const token = await createUserSession(user.id);

    return NextResponse.json({ token, userId: user.id, email: memberRow.email });
  } catch (error) {
    return errorResponse(error);
  }
}
