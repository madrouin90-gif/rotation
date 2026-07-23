import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { logAction } from "@/lib/auditLog";

interface ToggleFavoriteBody {
  itemId?: string;
}

export async function POST(request: Request) {
  try {
    const member = await requireMember(request);
    const body = (await request.json()) as ToggleFavoriteBody;
    const itemId = body.itemId ?? "";

    if (!itemId) {
      throw new AppError("Favori invalide.");
    }

    const { data: item, error: itemError } = await supabaseAdmin
      .from("items")
      .select("id, members!inner(group_id)")
      .eq("id", itemId)
      .maybeSingle();

    if (itemError || !item) {
      throw new AppError("Ce partage n'existe pas ou plus.", 404);
    }

    const itemGroupId = (item as unknown as { members: { group_id: string } }).members.group_id;
    if (itemGroupId !== member.group_id) {
      throw new AppError("Tu ne peux mettre en favori que les partages de ton propre groupe.", 403);
    }

    const { data: existing } = await supabaseAdmin
      .from("favorites")
      .select("id")
      .eq("item_id", itemId)
      .eq("member_id", member.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin.from("favorites").delete().eq("id", existing.id);
      if (error) throw new AppError("Impossible de retirer ce favori.", 500);

      await logAction({
        groupId: member.group_id,
        memberId: member.id,
        memberPseudo: member.pseudo,
        action: "favorite_removed",
        metadata: { itemId },
      });

      return NextResponse.json({ ok: true, favorited: false });
    }

    const { error } = await supabaseAdmin.from("favorites").insert({ item_id: itemId, member_id: member.id });
    if (error) throw new AppError("Impossible d'ajouter ce favori.", 500);

    await logAction({
      groupId: member.group_id,
      memberId: member.id,
      memberPseudo: member.pseudo,
      action: "favorite_added",
      metadata: { itemId },
    });

    return NextResponse.json({ ok: true, favorited: true });
  } catch (error) {
    return errorResponse(error);
  }
}
