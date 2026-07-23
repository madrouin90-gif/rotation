import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireMemberInGroup } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { normalizeGroupCode } from "@/lib/codes";
import { computeRatingAggregate } from "@/lib/ratings";
import type { FavoriteEntry, Item } from "@/types";

interface FavoriteRow {
  item_id: string;
  created_at: string;
  items: Item & { members: { id: string; pseudo: string; avatar_emoji: string; avatar_color: string } };
}

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await params;
    const code = normalizeGroupCode(rawCode);
    const { member, group } = await requireMemberInGroup(request, code);

    const { data: favoriteRows, error } = await supabaseAdmin
      .from("favorites")
      .select(
        "item_id, created_at, items(id, member_id, spotify_id, spotify_url, type, title, artist_name, artwork_url, genres, first_added_at, members(id, pseudo, avatar_emoji, avatar_color))"
      )
      .eq("member_id", member.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new AppError("Impossible de charger tes favoris.", 500);
    }

    const rows = (favoriteRows ?? []) as unknown as FavoriteRow[];
    const itemIds = rows.map((r) => r.item_id);

    const { data: ratingRows } = await supabaseAdmin
      .from("ratings")
      .select("item_id, score")
      .in("item_id", itemIds.length > 0 ? itemIds : ["00000000-0000-0000-0000-000000000000"]);

    const ratingsByItem = new Map<string, number[]>();
    for (const r of ratingRows ?? []) {
      const list = ratingsByItem.get(r.item_id) ?? [];
      list.push(r.score);
      ratingsByItem.set(r.item_id, list);
    }

    const entries: FavoriteEntry[] = rows.map((r) => {
      const aggregate = computeRatingAggregate(ratingsByItem.get(r.item_id) ?? []);
      const { members: owner, ...item } = r.items;
      return {
        item: {
          ...item,
          rating: {
            average: aggregate?.average ?? 0,
            scoreOn100: aggregate?.scoreOn100 ?? 0,
            votesCount: aggregate?.votesCount ?? 0,
            myScore: null,
          },
          isFavorite: true,
        },
        owner: {
          memberId: owner.id,
          pseudo: owner.pseudo,
          avatarEmoji: owner.avatar_emoji,
          avatarColor: owner.avatar_color,
        },
        favoritedAt: r.created_at,
      };
    });

    return NextResponse.json({ groupName: group.name, entries });
  } catch (error) {
    return errorResponse(error);
  }
}
