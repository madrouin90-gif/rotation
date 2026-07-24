import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rateLimit";
import { sendEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_VALID_HOURS = 1;

interface ForgotPasswordBody {
  email?: string;
}

/**
 * Répond toujours {ok:true} de façon identique, qu'un compte existe pour cet email ou
 * non — évite de révéler par le comportement de la réponse quels emails ont un compte.
 */
export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "auth-forgot-password", 5, 60 * 60);

    const body = (await request.json()) as ForgotPasswordBody;
    const email = body.email?.trim().toLowerCase() ?? "";

    if (EMAIL_RE.test(email)) {
      const { data: user } = await supabaseAdmin.from("users").select("id").eq("email", email).maybeSingle();

      if (user) {
        const resetToken = randomUUID();
        const expiresAt = new Date(Date.now() + RESET_VALID_HOURS * 60 * 60 * 1000).toISOString();

        await supabaseAdmin
          .from("users")
          .update({ password_reset_token: resetToken, password_reset_expires_at: expiresAt })
          .eq("id", user.id);

        const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
        const resetUrl = `${baseUrl}/compte/reinitialiser-mot-de-passe?token=${resetToken}`;

        await sendEmail({
          to: email,
          subject: "Réinitialise ton mot de passe — Rotation",
          html: `
            <p>Tu as demandé à réinitialiser ton mot de passe Rotation.</p>
            <p>Clique sur le lien ci-dessous (valide 1 heure) :</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>Si tu n'es pas à l'origine de cette demande, ignore ce courriel — ton mot de passe reste inchangé.</p>
          `,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
