import { NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireDiscordBot } from "@/lib/discordBotAuth";
import { getGroupById } from "@/lib/groupState";
import { AppError, errorResponse } from "@/lib/errors";
import { logAction } from "@/lib/auditLog";
import { enforceRateLimit } from "@/lib/rateLimit";
import { placeShareForMember } from "@/lib/shareActions";
import { notifyGroupEvent } from "@/lib/notifications";

interface DiscordShareBody {
  guildId?: string;
  channelId?: string;
  discordUserId?: string;
  spotifyUrl?: string;
}

/**
 * Appelé par le bot Discord (discord-bot/) quand un lien Spotify est posté dans un salon
 * lié à un groupe. Auth par secret partagé (pas de session membre — le bot agit pour le
 * compte d'un membre identifié par son discord_user_id). Réutilise exactement la même
 * logique de partage que POST /api/shares (`placeShareForMember`).
 */
export async function POST(request: Request) {
  try {
    requireDiscordBot(request);
    await enforceRateLimit(request, "discord-share", 120, 300);

    const body = (await request.json()) as DiscordShareBody;
    const guildId = body.guildId?.trim() ?? "";
    const channelId = body.channelId?.trim() ?? "";
    const discordUserId = body.discordUserId?.trim() ?? "";
    const spotifyUrl = body.spotifyUrl?.trim() ?? "";

    if (!guildId || !channelId || !discordUserId || !spotifyUrl) {
      throw new AppError("Paramètres manquants.");
    }

    const { data: groupRow } = await supabaseAdmin
      .from("groups")
      .select("id")
      .eq("discord_guild_id", guildId)
      .eq("discord_channel_id", channelId)
      .maybeSingle();

    if (!groupRow) {
      return NextResponse.json({ status: "not_linked_channel" }, { status: 404 });
    }

    const { data: memberRow } = await supabaseAdmin
      .from("members")
      .select("id, group_id, pseudo")
      .eq("group_id", groupRow.id)
      .eq("discord_user_id", discordUserId)
      .maybeSingle();

    if (!memberRow) {
      return NextResponse.json({ status: "member_not_linked" }, { status: 403 });
    }

    const group = await getGroupById(groupRow.id);

    const outcome = await placeShareForMember(memberRow, group, { spotifyUrl });

    if (outcome.status === "slots_full") {
      return NextResponse.json({ status: "slots_full" }, { status: 409 });
    }

    await logAction({
      groupId: memberRow.group_id,
      memberId: memberRow.id,
      memberPseudo: memberRow.pseudo,
      action: "share_added",
      metadata: { rank: outcome.rank, title: outcome.title, via: "discord" },
    });

    after(() =>
      notifyGroupEvent({
        group,
        eventType: "share_activity",
        actorMemberId: memberRow.id,
        title: `${memberRow.pseudo} a partagé`,
        body: outcome.title,
        url: `/g/${group.code}`,
      })
    );

    return NextResponse.json({ status: "ok", rank: outcome.rank, title: outcome.title });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ status: "invalid", message: error.message }, { status: error.status });
    }
    return errorResponse(error);
  }
}
