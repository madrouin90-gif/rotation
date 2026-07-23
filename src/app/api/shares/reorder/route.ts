import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { logAction } from "@/lib/auditLog";

interface ReorderBody {
  order?: string[];
}

export async function PATCH(request: Request) {
  try {
    const member = await requireMember(request);
    const body = (await request.json()) as ReorderBody;
    const order = body.order ?? [];

    const { data: currentShares, error } = await supabaseAdmin
      .from("shares")
      .select("id, rank")
      .eq("member_id", member.id);

    if (error || !currentShares) {
      throw new AppError("Impossible de charger tes slots.", 500);
    }

    const currentIds = new Set(currentShares.map((s) => s.id));
    const orderIds = new Set(order);

    if (
      order.length !== currentShares.length ||
      currentIds.size !== orderIds.size ||
      ![...currentIds].every((id) => orderIds.has(id))
    ) {
      throw new AppError("La liste de réordonnancement ne correspond pas à tes slots actuels.");
    }

    // Passe par des rangs temporaires négatifs pour éviter les conflits sur la contrainte unique (member_id, rank).
    for (let i = 0; i < order.length; i++) {
      await supabaseAdmin
        .from("shares")
        .update({ rank: -(i + 1) })
        .eq("id", order[i]);
    }
    for (let i = 0; i < order.length; i++) {
      await supabaseAdmin
        .from("shares")
        .update({ rank: i + 1 })
        .eq("id", order[i]);
    }

    await logAction({
      groupId: member.group_id,
      memberId: member.id,
      memberPseudo: member.pseudo,
      action: "shares_reordered",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
