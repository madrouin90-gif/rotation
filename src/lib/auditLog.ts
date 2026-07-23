import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

interface LogActionParams {
  groupId: string;
  memberId?: string | null;
  memberPseudo?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
}

/** Le journal ne doit jamais faire échouer l'action réelle qu'il enregistre. */
export async function logAction(params: LogActionParams) {
  try {
    await supabaseAdmin.from("audit_log").insert({
      group_id: params.groupId,
      member_id: params.memberId ?? null,
      member_pseudo: params.memberPseudo ?? null,
      action: params.action,
      metadata: params.metadata ?? {},
    });
  } catch {
    // Ignoré volontairement.
  }
}
