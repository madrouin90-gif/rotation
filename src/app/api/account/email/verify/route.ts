import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token") ?? "";

  if (!token) {
    return NextResponse.redirect(new URL("/?emailVerified=0", origin));
  }

  const { data: member, error } = await supabaseAdmin
    .from("members")
    .select("id, group_id")
    .eq("email_verify_token", token)
    .maybeSingle();

  if (error || !member) {
    return NextResponse.redirect(new URL("/?emailVerified=0", origin));
  }

  await supabaseAdmin
    .from("members")
    .update({ email_verified_at: new Date().toISOString(), email_verify_token: null })
    .eq("id", member.id);

  const { data: group } = await supabaseAdmin.from("groups").select("code").eq("id", member.group_id).maybeSingle();

  if (!group) {
    return NextResponse.redirect(new URL("/?emailVerified=0", origin));
  }

  return NextResponse.redirect(new URL(`/g/${group.code}?emailVerified=1`, origin));
}
