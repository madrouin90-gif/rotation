import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdminInGroup } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { normalizeGroupCode } from "@/lib/codes";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ code: string; id: string }> }
) {
  try {
    const { code: rawCode, id: memberId } = await params;
    const code = normalizeGroupCode(rawCode);
    const { member } = await requireAdminInGroup(request, code);

    if (member.id === memberId) {
      throw new AppError("Tu ne peux pas te retirer toi-même du groupe.");
    }

    const { data: target, error: fetchError } = await supabaseAdmin
      .from("members")
      .select("id, group_id")
      .eq("id", memberId)
      .maybeSingle();

    if (fetchError || !target || target.group_id !== member.group_id) {
      throw new AppError("Ce membre n'existe pas dans ce groupe.", 404);
    }

    const { error } = await supabaseAdmin.from("members").delete().eq("id", memberId);
    if (error) throw new AppError("Impossible de retirer ce membre.", 500);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
