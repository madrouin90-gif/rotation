import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { logAction } from "@/lib/auditLog";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const member = await requireMember(request);

    const { data: comment, error } = await supabaseAdmin
      .from("comments")
      .select("id, member_id, item_id, items!inner(member_id, members!inner(group_id))")
      .eq("id", id)
      .maybeSingle();

    if (error || !comment) {
      throw new AppError("Ce commentaire n'existe pas ou plus.", 404);
    }

    const commentGroupId = (comment as unknown as { items: { members: { group_id: string } } }).items.members
      .group_id;

    if (commentGroupId !== member.group_id) {
      throw new AppError("Tu ne peux pas modérer ce commentaire.", 403);
    }

    if (comment.member_id !== member.id && !member.is_admin) {
      throw new AppError("Tu ne peux retirer que tes propres commentaires.", 403);
    }

    const { error: deleteError } = await supabaseAdmin.from("comments").delete().eq("id", id);
    if (deleteError) throw new AppError("Impossible de retirer ce commentaire.", 500);

    await logAction({
      groupId: member.group_id,
      memberId: member.id,
      memberPseudo: member.pseudo,
      action: "comment_removed",
      metadata: { commentId: id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
