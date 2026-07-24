import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AppError, errorResponse } from "@/lib/errors";
import { verifyPassword } from "@/lib/password";
import { createUserSession } from "@/lib/sessions";
import { enforceRateLimit } from "@/lib/rateLimit";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

interface LoginBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "auth-login", 10, 5 * 60);

    const body = (await request.json()) as LoginBody;
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      throw new AppError("Entre ton courriel et ton mot de passe.");
    }

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, password_hash, failed_login_attempts, login_locked_until")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      throw new AppError("Impossible de vérifier ce compte.", 500);
    }

    if (user?.login_locked_until && new Date(user.login_locked_until).getTime() > Date.now()) {
      throw new AppError("Trop de tentatives. Réessaie dans quelques minutes.", 429);
    }

    const passwordOk = Boolean(user) && (await verifyPassword(password, user!.password_hash));

    if (!user || !passwordOk) {
      if (user) {
        const attempts = user.failed_login_attempts + 1;
        const update: { failed_login_attempts: number; login_locked_until?: string } = {
          failed_login_attempts: attempts,
        };
        if (attempts >= MAX_FAILED_ATTEMPTS) {
          update.login_locked_until = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString();
        }
        await supabaseAdmin.from("users").update(update).eq("id", user.id);
      }
      throw new AppError("Courriel ou mot de passe incorrect.", 401);
    }

    if (user.failed_login_attempts > 0 || user.login_locked_until) {
      await supabaseAdmin.from("users").update({ failed_login_attempts: 0, login_locked_until: null }).eq("id", user.id);
    }

    const token = await createUserSession(user.id);

    return NextResponse.json({ token, userId: user.id, email });
  } catch (error) {
    return errorResponse(error);
  }
}
