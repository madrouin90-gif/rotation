import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendPushToMembers } from "@/lib/webPush";
import type { Group, NotificationEventType } from "@/types";

interface NotifyGroupEventParams {
  group: Pick<Group, "id" | "settings">;
  eventType: NotificationEventType;
  actorMemberId: string;
  title: string;
  body: string;
  url: string;
  /** Restreint les destinataires à cette liste (ex. le propriétaire d'un partage, les admins).
   * Si omis, diffuse à tous les membres actifs/approuvés du groupe. */
  onlyMemberIds?: string[];
  /** Exclut l'auteur de l'action des destinataires. Par défaut true — on ne se notifie jamais soi-même. */
  excludeActor?: boolean;
}

/**
 * Point d'entrée unique pour toute notification push liée à l'activité d'un groupe.
 * No-op immédiat si ce type d'événement n'est pas activé dans les réglages du groupe.
 * Ne throw jamais — l'échec d'une notification ne doit jamais faire échouer l'action réelle.
 */
export async function notifyGroupEvent({
  group,
  eventType,
  actorMemberId,
  title,
  body,
  url,
  onlyMemberIds,
  excludeActor = true,
}: NotifyGroupEventParams): Promise<void> {
  try {
    if (!group.settings.notification_events.includes(eventType)) return;

    let recipientIds: string[];
    if (onlyMemberIds) {
      recipientIds = onlyMemberIds;
    } else {
      const { data: members, error } = await supabaseAdmin
        .from("members")
        .select("id")
        .eq("group_id", group.id)
        .eq("is_active", true)
        .eq("approval_status", "approved");
      if (error || !members) return;
      recipientIds = members.map((m) => m.id);
    }

    if (excludeActor) {
      recipientIds = recipientIds.filter((id) => id !== actorMemberId);
    }

    if (recipientIds.length === 0) return;

    await sendPushToMembers(recipientIds, { title, body, url });
  } catch (err) {
    console.error("notifyGroupEvent failed", err);
  }
}
