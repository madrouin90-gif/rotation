import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AppError, errorResponse } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { createUserSession } from "@/lib/sessions";
import { enforceRateLimit } from "@/lib/rateLimit";
import { sendEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SignupBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "auth-signup", 10, 10 * 60);

    const body = (await request.json()) as SignupBody;
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!EMAIL_RE.test(email)) {
      throw new AppError("Adresse courriel invalide.");
    }
    if (password.length < 8 || password.length > 72) {
      throw new AppError("Ton mot de passe doit contenir entre 8 et 72 caractères.");
    }

    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      throw new AppError("Un compte existe déjà avec ce courriel. Connecte-toi plutôt.", 409);
    }

    const passwordHash = await hashPassword(password);
    const verifyToken = randomUUID();

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .insert({ email, password_hash: passwordHash, email_verify_token: verifyToken })
      .select("id")
      .single();

    if (error || !user) {
      throw new AppError("Impossible de créer le compte. Réessaie.", 500);
    }

    const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
    const verifyUrl = `${baseUrl}/api/auth/verify?token=${verifyToken}`;

    await sendEmail({
      to: email,
      subject: "Confirme ton courriel — Rotation",
      html: `
        <p>Bienvenue sur Rotation !</p>
        <p>Clique sur le lien ci-dessous pour confirmer ton adresse courriel :</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p>Si tu n'es pas à l'origine de cette demande, ignore ce courriel.</p>
      `,
    });

    const token = await createUserSession(user.id);

    return NextResponse.json({ token, userId: user.id, email });
  } catch (error) {
    return errorResponse(error);
  }
}
