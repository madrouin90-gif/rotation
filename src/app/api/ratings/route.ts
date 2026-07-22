import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { computeRatingAggregate } from "@/lib/ratings";

interface RateBody {
  itemId?: string;
  score?: number;
}

export async function POST(request: Request) {
  try {
    const member = await requireMember(request);
    const body = (await request.json()) as RateBody;
    const itemId = body.itemId ?? "";
    const score = body.score;

    if (!itemId || score === undefined || !Number.isInteger(score) || score < 0 || score > 10) {
      throw new AppError("Note invalide. Choisis un entier entre 0 et 10.");
    }

    const { data: item, error: itemError } = await supabaseAdmin
      .from("items")
      .select("id, member_id, members!inner(group_id)")
      .eq("id", itemId)
      .maybeSingle();

    if (itemError || !item) {
      throw new AppError("Ce partage n'existe pas ou plus.", 404);
    }

    const itemGroupId = (item as unknown as { members: { group_id: string } }).members.group_id;
    if (itemGroupId !== member.group_id) {
      throw new AppError("Tu ne peux noter que les partages de ton propre groupe.", 403);
    }
    if (item.member_id === member.id) {
      throw new AppError("Tu ne peux pas noter tes propres partages.", 403);
    }

    const { error: upsertError } = await supabaseAdmin.from("ratings").upsert(
      {
        item_id: itemId,
        rater_member_id: member.id,
        score,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "item_id,rater_member_id" }
    );

    if (upsertError) {
      throw new AppError("Impossible d'enregistrer ta note.", 500);
    }

    const { data: allRatings, error: fetchError } = await supabaseAdmin
      .from("ratings")
      .select("score")
      .eq("item_id", itemId);

    if (fetchError) {
      throw new AppError("Impossible de recalculer le score.", 500);
    }

    const aggregate = computeRatingAggregate((allRatings ?? []).map((r) => r.score));

    return NextResponse.json({
      average: aggregate?.average ?? 0,
      scoreOn100: aggregate?.scoreOn100 ?? 0,
      votesCount: aggregate?.votesCount ?? 0,
      myScore: score,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
