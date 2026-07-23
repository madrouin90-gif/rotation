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

    const { data: reordered, error } = await supabaseAdmin.rpc("reorder_shares", {
      p_member_id: member.id,
      p_share_ids: order,
    });

    if (error) {
      throw new AppError("Impossible de réordonner tes slots.", 500);
    }
    if (!reordered) {
      throw new AppError("La liste de réordonnancement ne correspond pas à tes slots actuels.");
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
