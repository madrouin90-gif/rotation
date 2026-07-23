import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token") ?? "";

  if (!token) {
    return NextResponse.redirect(new URL("/?unsubscribed=0", origin));
  }

  const { data: member, error } = await supabaseAdmin
    .from("members")
    .select("id, group_id")
    .eq("email_verify_token", token)
    .maybeSingle();

  if (error || !member) {
    return NextResponse.redirect(new URL("/?unsubscribed=0", origin));
  }

  // Garde l'adresse mais arrête les envois : la prochaine collecte du digest exclura ce
  // membre (elle exige email_verified_at not null). Renvoyer un courriel depuis les
  // réglages redéclenche un cycle de vérification complet pour réactiver.
  await supabaseAdmin.from("members").update({ email_verified_at: null }).eq("id", member.id);

  const { data: group } = await supabaseAdmin.from("groups").select("code").eq("id", member.group_id).maybeSingle();

  if (!group) {
    return NextResponse.redirect(new URL("/?unsubscribed=1", origin));
  }

  return NextResponse.redirect(new URL(`/g/${group.code}?unsubscribed=1`, origin));
}
