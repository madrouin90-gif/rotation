import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { hashPassword } from "@/lib/password";

interface SetPasswordBody {
  password?: string;
}

export async function POST(request: Request) {
  try {
    const member = await requireMember(request);
    const body = (await request.json()) as SetPasswordBody;
    const password = body.password ?? "";

    if (password.length < 4 || password.length > 72) {
      throw new AppError("Ton mot de passe doit contenir entre 4 et 72 caractères.");
    }

    const passwordHash = await hashPassword(password);

    const { error } = await supabaseAdmin
      .from("members")
      .update({ password_hash: passwordHash })
      .eq("id", member.id);

    if (error) throw new AppError("Impossible d'enregistrer ton mot de passe.", 500);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
