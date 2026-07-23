import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdminInGroup, requireMemberInGroup } from "@/lib/auth";
import { getGroupById } from "@/lib/groupState";
import { AppError, errorResponse } from "@/lib/errors";
import { normalizeGroupCode } from "@/lib/codes";
import { logAction } from "@/lib/auditLog";

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
      .select("id, group_id, is_owner")
      .eq("id", memberId)
      .maybeSingle();

    if (fetchError || !target || target.group_id !== member.group_id) {
      throw new AppError("Ce membre n'existe pas dans ce groupe.", 404);
    }

    if (target.is_owner) {
      throw new AppError("Le créateur du groupe ne peut pas être retiré.", 403);
    }

    const { error } = await supabaseAdmin.from("members").delete().eq("id", memberId);
    if (error) throw new AppError("Impossible de retirer ce membre.", 500);

    await logAction({
      groupId: member.group_id,
      memberId: member.id,
      memberPseudo: member.pseudo,
      action: "member_removed",
      metadata: { targetMemberId: memberId },
    });

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
interface ApproveBody {
  action: "approve";
}
interface RejectBody {
  action: "reject";
}
interface PromoteAdminBody {
  action: "promote_admin";
  isAdmin: boolean;
}
type PatchBody = ToggleActiveBody | RenameBody | ApproveBody | RejectBody | PromoteAdminBody;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string; id: string }> }
) {
  try {
    const { code: rawCode, id: memberId } = await params;
    const code = normalizeGroupCode(rawCode);
    const { member } = await requireMemberInGroup(request, code);
    const body = (await request.json()) as PatchBody;

    const { data: target, error: fetchError } = await supabaseAdmin
      .from("members")
      .select("id, group_id, pseudo, approval_status, is_owner")
      .eq("id", memberId)
      .maybeSingle();

    if (fetchError || !target || target.group_id !== member.group_id) {
      throw new AppError("Ce membre n'existe pas dans ce groupe.", 404);
    }

    if (body.action === "promote_admin") {
      if (!member.is_owner) {
        throw new AppError("Seul le créateur du groupe peut effectuer cette action.", 403);
      }
      if (member.id === memberId) {
        throw new AppError("Tu ne peux pas modifier ton propre statut d'admin.");
      }
      if (target.is_owner) {
        throw new AppError("Le statut du créateur ne peut pas être modifié.", 403);
      }
      if (typeof body.isAdmin !== "boolean") {
        throw new AppError("Valeur invalide.");
      }

      const { error } = await supabaseAdmin
        .from("members")
        .update({ is_admin: body.isAdmin })
        .eq("id", memberId);
      if (error) throw new AppError("Impossible de mettre à jour ce membre.", 500);

      await logAction({
        groupId: member.group_id,
        memberId: member.id,
        memberPseudo: member.pseudo,
        action: "member_promoted",
        metadata: { targetMemberId: memberId, isAdmin: body.isAdmin },
      });

      return NextResponse.json({ ok: true, isAdmin: body.isAdmin });
    }

    if (!member.is_admin) {
      throw new AppError("Seul l'admin du groupe peut effectuer cette action.", 403);
    }

    if (body.action === "toggle_active") {
      if (member.id === memberId) {
        throw new AppError("Tu ne peux pas te désactiver toi-même.");
      }
      if (target.is_owner) {
        throw new AppError("Le créateur du groupe ne peut pas être désactivé.", 403);
      }
      if (typeof body.isActive !== "boolean") {
        throw new AppError("Valeur invalide.");
      }

      const { error } = await supabaseAdmin
        .from("members")
        .update({ is_active: body.isActive })
        .eq("id", memberId);
      if (error) throw new AppError("Impossible de mettre à jour ce membre.", 500);

      await logAction({
        groupId: member.group_id,
        memberId: member.id,
        memberPseudo: member.pseudo,
        action: "member_toggled_active",
        metadata: { targetMemberId: memberId, isActive: body.isActive },
      });

      return NextResponse.json({ ok: true, isActive: body.isActive });
    }

    if (body.action === "rename") {
      if (target.is_owner && !member.is_owner) {
        throw new AppError("Seul le créateur du groupe peut modifier son propre pseudo.", 403);
      }

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

      await logAction({
        groupId: member.group_id,
        memberId: member.id,
        memberPseudo: member.pseudo,
        action: "member_renamed",
        metadata: { targetMemberId: memberId, pseudo },
      });

      return NextResponse.json({ ok: true, pseudo });
    }

    if (body.action === "approve") {
      if (target.approval_status !== "pending") {
        throw new AppError("Cette demande n'est plus en attente.");
      }

      const group = await getGroupById(member.group_id);
      const { count } = await supabaseAdmin
        .from("members")
        .select("id", { count: "exact", head: true })
        .eq("group_id", member.group_id)
        .eq("approval_status", "approved");

      if ((count ?? 0) >= group.settings.max_members) {
        throw new AppError(
          `Le groupe est complet (maximum ${group.settings.max_members} membres) — augmente la limite ou retire un membre avant d'approuver.`
        );
      }

      const { error } = await supabaseAdmin
        .from("members")
        .update({ approval_status: "approved" })
        .eq("id", memberId);
      if (error) throw new AppError("Impossible d'approuver ce membre.", 500);

      await logAction({
        groupId: member.group_id,
        memberId: member.id,
        memberPseudo: member.pseudo,
        action: "member_approved",
        metadata: { targetMemberId: memberId, targetPseudo: target.pseudo },
      });

      return NextResponse.json({ ok: true });
    }

    if (body.action === "reject") {
      if (target.approval_status !== "pending") {
        throw new AppError("Cette demande n'est plus en attente.");
      }

      const { error } = await supabaseAdmin.from("members").delete().eq("id", memberId);
      if (error) throw new AppError("Impossible de rejeter cette demande.", 500);

      await logAction({
        groupId: member.group_id,
        memberId: member.id,
        memberPseudo: member.pseudo,
        action: "member_rejected",
        metadata: { targetMemberId: memberId, targetPseudo: target.pseudo },
      });

      return NextResponse.json({ ok: true });
    }

    throw new AppError("Action inconnue.");
  } catch (error) {
    return errorResponse(error);
  }
}
