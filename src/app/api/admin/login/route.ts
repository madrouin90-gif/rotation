import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AppError, errorResponse } from "@/lib/errors";
import { verifyPassword } from "@/lib/password";
import { setAdminSessionCookie } from "@/lib/adminAuth";
import { createSuperAdminSession } from "@/lib/sessions";

interface LoginBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      throw new AppError("Entre ton courriel et ton mot de passe.");
    }

    const { data, error } = await supabaseAdmin
      .from("super_admins")
      .select("id, email, password_hash")
      .eq("email", email)
      .maybeSingle();

    if (error || !data || !(await verifyPassword(password, data.password_hash))) {
      throw new AppError("Courriel ou mot de passe incorrect.", 401);
    }

    const token = await createSuperAdminSession(data.id);
    await setAdminSessionCookie(token);

    return NextResponse.json({ ok: true, email: data.email });
  } catch (error) {
    return errorResponse(error);
  }
}
