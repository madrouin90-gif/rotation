import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { logAction } from "@/lib/auditLog";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const member = await requireMember(request);

    const { data: message, error } = await supabaseAdmin
      .from("group_messages")
      .select("id, group_id, member_id")
      .eq("id", id)
      .maybeSingle();

    if (error || !message) {
      throw new AppError("Ce message n'existe pas ou plus.", 404);
    }

    if (message.group_id !== member.group_id) {
      throw new AppError("Tu ne peux pas modérer ce message.", 403);
    }

    if (message.member_id !== member.id && !member.is_admin) {
      throw new AppError("Tu ne peux retirer que tes propres messages.", 403);
    }

    const { error: deleteError } = await supabaseAdmin.from("group_messages").delete().eq("id", id);
    if (deleteError) throw new AppError("Impossible de retirer ce message.", 500);

    await logAction({
      groupId: member.group_id,
      memberId: member.id,
      memberPseudo: member.pseudo,
      action: "group_message_removed",
      metadata: { messageId: id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
