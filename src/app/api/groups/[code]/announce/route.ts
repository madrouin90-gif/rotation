import { NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdminInGroup } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { normalizeGroupCode } from "@/lib/codes";
import { logAction } from "@/lib/auditLog";
import { enforceRateLimit } from "@/lib/rateLimit";
import { sendPushToMembers } from "@/lib/webPush";

const MAX_MESSAGE_LENGTH = 300;

interface AnnounceBody {
  message?: string;
  targetMemberId?: string;
}

/**
 * Message push envoyé par un admin, à la demande (pas un événement automatique) — donc pas
 * soumis à settings.notification_events, qui ne régit que les notifications déclenchées par
 * l'activité du groupe. Un membre doit quand même avoir activé les notifications sur son
 * appareil (sendPushToMembers n'envoie qu'aux abonnements existants).
 */
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    await enforceRateLimit(request, "group-announce", 10, 60 * 60);

    const { code: rawCode } = await params;
    const code = normalizeGroupCode(rawCode);
    const { member, group } = await requireAdminInGroup(request, code);

    const body = (await request.json()) as AnnounceBody;
    const message = body.message?.trim() ?? "";
    const targetMemberId = body.targetMemberId?.trim() || null;

    if (message.length < 1 || message.length > MAX_MESSAGE_LENGTH) {
      throw new AppError(`Le message doit contenir entre 1 et ${MAX_MESSAGE_LENGTH} caractères.`);
    }

    let recipientIds: string[];
    let targetPseudo: string | null = null;

    if (targetMemberId) {
      const { data: target, error: targetError } = await supabaseAdmin
        .from("members")
        .select("id, pseudo, group_id, is_active, approval_status")
        .eq("id", targetMemberId)
        .maybeSingle();

      if (targetError || !target || target.group_id !== group.id) {
        throw new AppError("Ce membre n'existe pas dans ce groupe.", 404);
      }
      if (!target.is_active || target.approval_status !== "approved") {
        throw new AppError("Ce membre n'est pas actif dans ce groupe.");
      }

      recipientIds = [target.id];
      targetPseudo = target.pseudo;
    } else {
      const { data: members, error: membersError } = await supabaseAdmin
        .from("members")
        .select("id")
        .eq("group_id", group.id)
        .eq("is_active", true)
        .eq("approval_status", "approved")
        .neq("id", member.id);

      if (membersError) {
        throw new AppError("Impossible de charger les membres du groupe.", 500);
      }
      recipientIds = (members ?? []).map((m) => m.id);
    }

    after(() =>
      sendPushToMembers(recipientIds, {
        title: `📢 ${group.name}`,
        body: message,
        url: `/g/${group.code}`,
      })
    );

    await logAction({
      groupId: group.id,
      memberId: member.id,
      memberPseudo: member.pseudo,
      action: "admin_announce_sent",
      metadata: { targetMemberId, targetPseudo, recipientCount: recipientIds.length },
    });

    return NextResponse.json({ ok: true, recipientCount: recipientIds.length });
  } catch (error) {
    return errorResponse(error);
  }
}
