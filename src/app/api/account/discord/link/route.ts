import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { getDiscordAuthorizeUrl } from "@/lib/discord";

const STATE_TTL_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const member = await requireMember(request);

    if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
      throw new AppError("L'intégration Discord n'est pas configurée sur ce serveur.", 500);
    }

    const state = randomUUID();
    const expiresAt = new Date(Date.now() + STATE_TTL_MS).toISOString();

    const { error } = await supabaseAdmin
      .from("members")
      .update({ discord_link_state: state, discord_link_state_expires_at: expiresAt })
      .eq("id", member.id);

    if (error) throw new AppError("Impossible de démarrer la liaison avec Discord.", 500);

    const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/account/discord/callback`;

    return NextResponse.json({ redirectUrl: getDiscordAuthorizeUrl(state, redirectUri) });
  } catch (error) {
    return errorResponse(error);
  }
}
