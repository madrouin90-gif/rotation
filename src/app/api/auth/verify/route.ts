import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token") ?? "";

  if (!token) {
    return NextResponse.redirect(new URL("/?accountVerified=0", origin));
  }

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email_verify_token", token)
    .maybeSingle();

  if (error || !user) {
    return NextResponse.redirect(new URL("/?accountVerified=0", origin));
  }

  await supabaseAdmin
    .from("users")
    .update({ email_verified_at: new Date().toISOString(), email_verify_token: null })
    .eq("id", user.id);

  return NextResponse.redirect(new URL("/compte/mes-groupes?accountVerified=1", origin));
}
