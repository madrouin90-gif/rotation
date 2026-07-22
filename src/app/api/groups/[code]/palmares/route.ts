import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireMemberInGroup } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { computeRatingAggregate } from "@/lib/ratings";
import { normalizeGroupCode } from "@/lib/codes";
import type { Item, PalmaresEntry } from "@/types";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await params;
    const code = normalizeGroupCode(rawCode);
    const { group } = await requireMemberInGroup(request, code);

    const { data: memberRows, error: membersError } = await supabaseAdmin
      .from("members")
      .select("id, pseudo, avatar_emoji, avatar_color")
      .eq("group_id", group.id);

    if (membersError || !memberRows) {
      throw new AppError("Impossible de charger les membres du groupe.", 500);
    }

    const memberIds = memberRows.map((m) => m.id);
    const memberMap = new Map(memberRows.map((m) => [m.id, m]));

    const { data: itemRows, error: itemsError } = await supabaseAdmin
      .from("items")
      .select("*")
      .in("member_id", memberIds.length > 0 ? memberIds : ["00000000-0000-0000-0000-000000000000"]);

    if (itemsError || !itemRows) {
      throw new AppError("Impossible de charger les partages du groupe.", 500);
    }

    const itemIds = itemRows.map((i) => i.id);
    const { data: ratingRows, error: ratingsError } = await supabaseAdmin
      .from("ratings")
      .select("item_id, rater_member_id, score")
      .in("item_id", itemIds.length > 0 ? itemIds : ["00000000-0000-0000-0000-000000000000"]);

    if (ratingsError) {
      throw new AppError("Impossible de charger les notes.", 500);
    }

    const ratingsByItem = new Map<string, { rater_member_id: string; score: number }[]>();
    for (const r of ratingRows ?? []) {
      const list = ratingsByItem.get(r.item_id) ?? [];
      list.push(r);
      ratingsByItem.set(r.item_id, list);
    }

    const entries: PalmaresEntry[] = [];

    for (const item of itemRows as Item[]) {
      const votes = ratingsByItem.get(item.id) ?? [];
      if (votes.length === 0) continue;

      const aggregate = computeRatingAggregate(votes.map((v) => v.score));
      if (!aggregate) continue;

      const owner = memberMap.get(item.member_id);
      if (!owner) continue;

      entries.push({
        item,
        owner: {
          memberId: owner.id,
          pseudo: owner.pseudo,
          avatarEmoji: owner.avatar_emoji,
          avatarColor: owner.avatar_color,
        },
        average: aggregate.average,
        scoreOn100: aggregate.scoreOn100,
        votesCount: aggregate.votesCount,
        votes: votes
          .map((v) => {
            const rater = memberMap.get(v.rater_member_id);
            return rater
              ? {
                  memberId: rater.id,
                  pseudo: rater.pseudo,
                  avatarEmoji: rater.avatar_emoji,
                  avatarColor: rater.avatar_color,
                  score: v.score,
                }
              : null;
          })
          .filter((v): v is NonNullable<typeof v> => v !== null)
          .sort((a, b) => b.score - a.score),
      });
    }

    entries.sort((a, b) => {
      if (b.scoreOn100 !== a.scoreOn100) return b.scoreOn100 - a.scoreOn100;
      if (b.votesCount !== a.votesCount) return b.votesCount - a.votesCount;
      return a.item.first_added_at.localeCompare(b.item.first_added_at);
    });

    return NextResponse.json({ entries });
  } catch (error) {
    return errorResponse(error);
  }
}
