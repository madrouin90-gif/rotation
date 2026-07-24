import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import { getGroupById, spotifyTypeLabelFr } from "@/lib/groupState";
import { AppError, errorResponse } from "@/lib/errors";
import { parseSpotifyUrl, fetchSpotifyOEmbed } from "@/lib/spotify";
import { suggestGenres } from "@/lib/spotifyApi";
import { enforceRateLimit } from "@/lib/rateLimit";

interface PreviewBody {
  url?: string;
}

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "preview", 30, 60);

    const member = await requireMember(request);
    const group = await getGroupById(member.group_id);

    const body = (await request.json()) as PreviewBody;
    const url = body.url?.trim() ?? "";

    const parsed = parseSpotifyUrl(url);
    if (!parsed) {
      throw new AppError(
        "Ce lien ne ressemble pas à un lien Spotify valide. Colle un lien vers une chanson, un album ou un artiste (open.spotify.com/...)."
      );
    }

    if (!group.settings.allowed_types.includes(parsed.type)) {
      throw new AppError(
        `Les partages de type "${spotifyTypeLabelFr(parsed.type)}" ne sont pas autorisés dans ce groupe.`
      );
    }

    const oembed = await fetchSpotifyOEmbed(parsed.canonicalUrl, parsed.type);
    const suggestedGenres = await suggestGenres(parsed.type, parsed.spotifyId, group.settings.genre_tags);

    return NextResponse.json({
      type: parsed.type,
      spotifyId: parsed.spotifyId,
      canonicalUrl: parsed.canonicalUrl,
      title: oembed.title,
      artistName: oembed.artistName,
      artworkUrl: oembed.artworkUrl,
      suggestedGenres,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
