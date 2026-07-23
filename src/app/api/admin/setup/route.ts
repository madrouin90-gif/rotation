import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AppError, errorResponse } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { setAdminSessionCookie } from "@/lib/adminAuth";
import { createSuperAdminSession } from "@/lib/sessions";

interface SetupBody {
  email?: string;
  password?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  try {
    const { count, error } = await supabaseAdmin.from("super_admins").select("id", { count: "exact", head: true });
    if (error) throw new AppError("Impossible de vérifier l'état du compte super-admin.", 500);
    return NextResponse.json({ needsSetup: (count ?? 0) === 0 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { count, error: countError } = await supabaseAdmin
      .from("super_admins")
      .select("id", { count: "exact", head: true });

    if (countError) throw new AppError("Impossible de vérifier l'état du compte super-admin.", 500);
    if ((count ?? 0) > 0) {
      throw new AppError("Un compte super-admin existe déjà.", 403);
    }

    const body = (await request.json()) as SetupBody;
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!EMAIL_RE.test(email)) {
      throw new AppError("Adresse courriel invalide.");
    }
    if (password.length < 8 || password.length > 72) {
      throw new AppError("Le mot de passe doit contenir entre 8 et 72 caractères.");
    }

    const passwordHash = await hashPassword(password);

    const { data: created, error } = await supabaseAdmin
      .from("super_admins")
      .insert({ email, password_hash: passwordHash })
      .select("id")
      .single();

    if (error || !created) {
      throw new AppError("Impossible de créer le compte super-admin.", 500);
    }

    const token = await createSuperAdminSession(created.id);
    await setAdminSessionCookie(token);

    return NextResponse.json({ ok: true, email });
  } catch (error) {
    return errorResponse(error);
  }
}
