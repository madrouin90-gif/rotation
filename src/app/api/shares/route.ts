import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { getGroupById, spotifyTypeLabelFr } from "@/lib/groupState";
import { AppError, errorResponse } from "@/lib/errors";
import { parseSpotifyUrl, fetchSpotifyOEmbed } from "@/lib/spotify";
import { logAction } from "@/lib/auditLog";

interface CreateShareBody {
  spotifyUrl?: string;
  note?: string;
  replaceRank?: number;
  genres?: string[];
}

interface PlaceShareResult {
  out_rank: number | null;
  out_status: "ok" | "slots_full" | "slot_missing";
}

export async function POST(request: Request) {
  try {
    const member = await requireMember(request);
    const group = await getGroupById(member.group_id);
    const settings = group.settings;

    const body = (await request.json()) as CreateShareBody;
    const spotifyUrl = body.spotifyUrl?.trim() ?? "";
    const note = body.note?.trim() ?? "";
    const replaceRank = body.replaceRank;
    const genres = Array.isArray(body.genres) ? body.genres.filter((g): g is string => typeof g === "string") : [];

    const parsed = parseSpotifyUrl(spotifyUrl);
    if (!parsed) {
      throw new AppError(
        "Ce lien ne ressemble pas à un lien Spotify valide. Colle un lien vers une chanson, un album ou un artiste."
      );
    }

    if (!settings.allowed_types.includes(parsed.type)) {
      throw new AppError(
        `Les partages de type "${spotifyTypeLabelFr(parsed.type)}" ne sont pas autorisés dans ce groupe.`
      );
    }

    const invalidGenres = genres.filter((g) => !settings.genre_tags.includes(g));
    if (invalidGenres.length > 0) {
      throw new AppError(`Genre(s) inconnu(s) dans ce groupe : ${invalidGenres.join(", ")}.`);
    }

    if (note.length > 0 && settings.note_max_length === 0) {
      throw new AppError("Les notes sont désactivées dans ce groupe.");
    }
    if (note.length > settings.note_max_length) {
      throw new AppError(`Ta note dépasse la limite de ${settings.note_max_length} caractères.`);
    }

    if (
      replaceRank !== undefined &&
      (!Number.isInteger(replaceRank) || replaceRank < 1 || replaceRank > settings.slots_per_member)
    ) {
      throw new AppError("Le slot à remplacer est invalide.");
    }

    // Pré-vérification légère AVANT tout appel réseau externe (oEmbed) : évite un
    // aller-retour Spotify inutile quand on sait déjà que l'opération est impossible.
    // L'écriture réelle passe par place_share (RPC atomique) qui revalide et exécute
    // tout dans la même transaction — cette étape n'est qu'un raccourci UX.
    const { data: currentShares, error: sharesError } = await supabaseAdmin
      .from("shares")
      .select("rank")
      .eq("member_id", member.id);

    if (sharesError) {
      throw new AppError("Impossible de vérifier tes slots actuels.", 500);
    }

    const usedRanks = new Set((currentShares ?? []).map((s) => s.rank));

    if (replaceRank !== undefined) {
      if (!usedRanks.has(replaceRank)) {
        throw new AppError("Ce slot n'existe pas ou est déjà libre.");
      }
    } else if (usedRanks.size >= settings.slots_per_member) {
      return NextResponse.json(
        {
          error: "Tes slots sont tous pleins. Choisis un partage à remplacer.",
          slotsFull: true,
        },
        { status: 409 }
      );
    }

    const oembed = await fetchSpotifyOEmbed(parsed.canonicalUrl, parsed.type);

    // Retrouve l'item existant du membre pour préserver first_added_at, ou en crée un nouveau.
    const { data: existingItem } = await supabaseAdmin
      .from("items")
      .select("id, first_added_at")
      .eq("member_id", member.id)
      .eq("spotify_id", parsed.spotifyId)
      .maybeSingle();

    let itemId: string;
    if (existingItem) {
      itemId = existingItem.id;
      await supabaseAdmin
        .from("items")
        .update({
          title: oembed.title,
          artist_name: oembed.artistName,
          artwork_url: oembed.artworkUrl,
          spotify_url: parsed.canonicalUrl,
          genres,
        })
        .eq("id", itemId);
    } else {
      const { data: newItem, error: itemError } = await supabaseAdmin
        .from("items")
        .insert({
          member_id: member.id,
          spotify_id: parsed.spotifyId,
          spotify_url: parsed.canonicalUrl,
          type: parsed.type,
          title: oembed.title,
          artist_name: oembed.artistName,
          artwork_url: oembed.artworkUrl,
          genres,
        })
        .select("id")
        .single();
      if (itemError || !newItem) {
        throw new AppError("Impossible d'enregistrer ce partage. Réessaie.", 500);
      }
      itemId = newItem.id;
    }

    const { data: placed, error: placeError } = await supabaseAdmin
      .rpc("place_share", {
        p_member_id: member.id,
        p_item_id: itemId,
        p_note: note || null,
        p_replace_rank: replaceRank ?? null,
        p_max_slots: settings.slots_per_member,
      })
      .single<PlaceShareResult>();

    if (placeError || !placed) {
      throw new AppError("Impossible d'enregistrer ce partage.", 500);
    }

    if (placed.out_status === "slot_missing") {
      throw new AppError("Ce slot n'existe pas ou est déjà libre.");
    }

    if (placed.out_status === "slots_full") {
      return NextResponse.json(
        {
          error: "Tes slots sont tous pleins. Choisis un partage à remplacer.",
          slotsFull: true,
        },
        { status: 409 }
      );
    }

    await logAction({
      groupId: member.group_id,
      memberId: member.id,
      memberPseudo: member.pseudo,
      action: replaceRank !== undefined ? "share_replaced" : "share_added",
      metadata: { rank: placed.out_rank, title: oembed.title },
    });

    return NextResponse.json({ ok: true, rank: placed.out_rank });
  } catch (error) {
    return errorResponse(error);
  }
}
