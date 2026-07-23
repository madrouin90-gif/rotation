import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { exchangeDiscordCode, fetchDiscordUser } from "@/lib/discord";
import { logAction } from "@/lib/auditLog";

/**
 * Pas d'auth via header ici : le navigateur revient d'une redirection complète depuis
 * Discord, qui ne peut porter aucun header custom. Le `state` (jeton éphémère stocké sur
 * le membre par /api/account/discord/link) EST l'authentification — même mécanique que
 * /api/account/email/verify avec email_verify_token.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  function fail(reason: string, redirectPath = "/") {
    return NextResponse.redirect(new URL(`${redirectPath}?discordLinked=0&reason=${reason}`, origin));
  }

  if (!code || !state) {
    return fail(searchParams.get("error") ? "denied" : "missing_params");
  }

  const { data: member, error: memberError } = await supabaseAdmin
    .from("members")
    .select("id, group_id, pseudo, discord_link_state_expires_at")
    .eq("discord_link_state", state)
    .maybeSingle();

  if (memberError || !member) {
    return fail("invalid_state");
  }

  const { data: group } = await supabaseAdmin.from("groups").select("code").eq("id", member.group_id).maybeSingle();
  const redirectPath = group ? `/g/${group.code}/membre/${member.id}` : "/";

  if (
    !member.discord_link_state_expires_at ||
    new Date(member.discord_link_state_expires_at).getTime() < Date.now()
  ) {
    return fail("expired", redirectPath);
  }

  let discordUser;
  try {
    const accessToken = await exchangeDiscordCode(code, `${process.env.APP_BASE_URL ?? origin}/api/account/discord/callback`);
    discordUser = await fetchDiscordUser(accessToken);
  } catch (err) {
    console.error("discord oauth callback failed", err);
    return fail("discord_error", redirectPath);
  }

  const { data: conflict } = await supabaseAdmin
    .from("members")
    .select("id")
    .eq("group_id", member.group_id)
    .eq("discord_user_id", discordUser.id)
    .neq("id", member.id)
    .maybeSingle();

  if (conflict) {
    return fail("already_linked", redirectPath);
  }

  const { error: updateError } = await supabaseAdmin
    .from("members")
    .update({
      discord_user_id: discordUser.id,
      discord_username: discordUser.username,
      discord_link_state: null,
      discord_link_state_expires_at: null,
    })
    .eq("id", member.id);

  if (updateError) {
    return fail("save_failed", redirectPath);
  }

  await logAction({
    groupId: member.group_id,
    memberId: member.id,
    memberPseudo: member.pseudo,
    action: "discord_linked",
    metadata: { discordUsername: discordUser.username },
  });

  return NextResponse.redirect(new URL(`${redirectPath}?discordLinked=1`, origin));
}
