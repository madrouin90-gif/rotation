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

interface ToggleActiveBody {
  action: "toggle_active";
  isActive: boolean;
}
interface RenameBody {
  action: "rename";
  pseudo: string;
}
type PatchBody = ToggleActiveBody | RenameBody;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string; id: string }> }
) {
  try {
    const { code: rawCode, id: memberId } = await params;
    const code = normalizeGroupCode(rawCode);
    const { member } = await requireAdminInGroup(request, code);
    const body = (await request.json()) as PatchBody;

    const { data: target, error: fetchError } = await supabaseAdmin
      .from("members")
      .select("id, group_id, pseudo")
      .eq("id", memberId)
      .maybeSingle();

    if (fetchError || !target || target.group_id !== member.group_id) {
      throw new AppError("Ce membre n'existe pas dans ce groupe.", 404);
    }

    if (body.action === "toggle_active") {
      if (member.id === memberId) {
        throw new AppError("Tu ne peux pas te désactiver toi-même.");
      }
      if (typeof body.isActive !== "boolean") {
        throw new AppError("Valeur invalide.");
      }

      const { error } = await supabaseAdmin
        .from("members")
        .update({ is_active: body.isActive })
        .eq("id", memberId);
      if (error) throw new AppError("Impossible de mettre à jour ce membre.", 500);

      return NextResponse.json({ ok: true, isActive: body.isActive });
    }

    if (body.action === "rename") {
      const pseudo = body.pseudo?.trim() ?? "";
      if (pseudo.length < 1 || pseudo.length > 24) {
        throw new AppError("Le pseudo doit contenir entre 1 et 24 caractères.");
      }

      const { data: groupMembers, error: groupMembersError } = await supabaseAdmin
        .from("members")
        .select("id, pseudo")
        .eq("group_id", member.group_id);

      if (groupMembersError || !groupMembers) {
        throw new AppError("Impossible de vérifier les pseudos du groupe.", 500);
      }

      const taken = groupMembers.some(
        (m) => m.id !== memberId && m.pseudo.toLowerCase() === pseudo.toLowerCase()
      );
      if (taken) {
        throw new AppError("Ce pseudo est déjà pris dans ce groupe.");
      }

      const { error } = await supabaseAdmin.from("members").update({ pseudo }).eq("id", memberId);
      if (error) throw new AppError("Impossible de renommer ce membre.", 500);

      return NextResponse.json({ ok: true, pseudo });
    }

    throw new AppError("Action inconnue.");
  } catch (error) {
    return errorResponse(error);
  }
}
