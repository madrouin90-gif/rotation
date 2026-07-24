import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AppError, errorResponse } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { revokeAllUserSessions } from "@/lib/sessions";
import { enforceRateLimit } from "@/lib/rateLimit";

interface ResetPasswordBody {
  token?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "auth-reset-password", 10, 60 * 60);

    const body = (await request.json()) as ResetPasswordBody;
    const token = body.token?.trim() ?? "";
    const password = body.password ?? "";

    if (!token) {
      throw new AppError("Lien de réinitialisation invalide.");
    }
    if (password.length < 8 || password.length > 72) {
      throw new AppError("Ton mot de passe doit contenir entre 8 et 72 caractères.");
    }

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, password_reset_expires_at")
      .eq("password_reset_token", token)
      .maybeSingle();

    if (error || !user) {
      throw new AppError("Lien de réinitialisation invalide ou déjà utilisé.", 400);
    }

    if (!user.password_reset_expires_at || new Date(user.password_reset_expires_at).getTime() < Date.now()) {
      throw new AppError("Ce lien a expiré — redemande une réinitialisation.", 400);
    }

    const passwordHash = await hashPassword(password);

    await supabaseAdmin
      .from("users")
      .update({ password_hash: passwordHash, password_reset_token: null, password_reset_expires_at: null })
      .eq("id", user.id);

    await revokeAllUserSessions(user.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
