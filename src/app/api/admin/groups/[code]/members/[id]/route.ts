import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { AppError, errorResponse } from "@/lib/errors";
import { normalizeGroupCode } from "@/lib/codes";

async function loadTarget(code: string, memberId: string) {
  const { data: group, error: groupError } = await supabaseAdmin
    .from("groups")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  if (groupError || !group) {
    throw new AppError("Ce groupe n'existe pas ou plus.", 404);
  }

  const { data: target, error: targetError } = await supabaseAdmin
    .from("members")
    .select("id, group_id")
    .eq("id", memberId)
    .maybeSingle();

  if (targetError || !target || target.group_id !== group.id) {
    throw new AppError("Ce membre n'existe pas dans ce groupe.", 404);
  }

  return { group, target };
}

interface ToggleActiveBody {
  action: "toggle_active";
  isActive: boolean;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string; id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { code: rawCode, id: memberId } = await params;
    const code = normalizeGroupCode(rawCode);
    await loadTarget(code, memberId);

    const body = (await request.json()) as ToggleActiveBody;
    if (body.action !== "toggle_active" || typeof body.isActive !== "boolean") {
      throw new AppError("Action ou valeur invalide.");
    }

    const { error } = await supabaseAdmin.from("members").update({ is_active: body.isActive }).eq("id", memberId);
    if (error) throw new AppError("Impossible de mettre à jour ce membre.", 500);

    return NextResponse.json({ ok: true, isActive: body.isActive });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ code: string; id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { code: rawCode, id: memberId } = await params;
    const code = normalizeGroupCode(rawCode);
    await loadTarget(code, memberId);

    const { error } = await supabaseAdmin.from("members").delete().eq("id", memberId);
    if (error) throw new AppError("Impossible de retirer ce membre.", 500);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
