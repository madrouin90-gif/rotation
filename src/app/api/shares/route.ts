import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { getGroupById, spotifyTypeLabelFr } from "@/lib/groupState";
import { AppError, errorResponse } from "@/lib/errors";
import { parseSpotifyUrl, fetchSpotifyOEmbed } from "@/lib/spotify";

interface CreateShareBody {
  spotifyUrl?: string;
  note?: string;
  replaceRank?: number;
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

    if (note.length > 0 && settings.note_max_length === 0) {
      throw new AppError("Les notes sont désactivées dans ce groupe.");
    }
    if (note.length > settings.note_max_length) {
      throw new AppError(`Ta note dépasse la limite de ${settings.note_max_length} caractères.`);
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
        })
        .select("id")
        .single();
      if (itemError || !newItem) {
        throw new AppError("Impossible d'enregistrer ce partage. Réessaie.", 500);
      }
      itemId = newItem.id;
    }

    const { data: currentShares, error: sharesError } = await supabaseAdmin
      .from("shares")
      .select("id, rank")
      .eq("member_id", member.id);

    if (sharesError) {
      throw new AppError("Impossible de vérifier tes slots actuels.", 500);
    }

    const usedRanks = new Set((currentShares ?? []).map((s) => s.rank));

    if (replaceRank !== undefined) {
      if (!Number.isInteger(replaceRank) || replaceRank < 1 || replaceRank > settings.slots_per_member) {
        throw new AppError("Le slot à remplacer est invalide.");
      }
      const target = (currentShares ?? []).find((s) => s.rank === replaceRank);
      if (!target) {
        throw new AppError("Ce slot n'existe pas ou est déjà libre.");
      }
      const { error } = await supabaseAdmin
        .from("shares")
        .update({ item_id: itemId, note: note || null, added_at: new Date().toISOString() })
        .eq("id", target.id);
      if (error) throw new AppError("Impossible de remplacer ce partage.", 500);

      await supabaseAdmin.from("share_events").insert({ member_id: member.id, item_id: itemId });

      return NextResponse.json({ ok: true, rank: replaceRank });
    }

    let freeRank: number | null = null;
    for (let r = 1; r <= settings.slots_per_member; r++) {
      if (!usedRanks.has(r)) {
        freeRank = r;
        break;
      }
    }

    if (freeRank === null) {
      return NextResponse.json(
        {
          error: "Tes slots sont tous pleins. Choisis un partage à remplacer.",
          slotsFull: true,
        },
        { status: 409 }
      );
    }

    const { error: insertError } = await supabaseAdmin.from("shares").insert({
      member_id: member.id,
      item_id: itemId,
      rank: freeRank,
      note: note || null,
    });

    if (insertError) throw new AppError("Impossible d'ajouter ce partage.", 500);

    await supabaseAdmin.from("share_events").insert({ member_id: member.id, item_id: itemId });

    return NextResponse.json({ ok: true, rank: freeRank });
  } catch (error) {
    return errorResponse(error);
  }
}
