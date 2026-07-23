import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";

interface EngagementBody {
  itemId?: string;
  eventType?: "listen";
}

const DEDUPE_WINDOW_MINUTES = 30;

export async function POST(request: Request) {
  try {
    const member = await requireMember(request);
    const body = (await request.json()) as EngagementBody;
    const itemId = body.itemId ?? "";
    const eventType = body.eventType ?? "listen";

    if (!itemId || eventType !== "listen") {
      throw new AppError("Événement invalide.");
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
      throw new AppError("Tu ne peux interagir qu'avec les partages de ton propre groupe.", 403);
    }

    // Déduplication : un même membre qui re-clique sur "Écouter" dans les 30 minutes
    // suivantes ne recompte pas une 2e écoute (double-clic, curiosité, etc.).
    const sinceIso = new Date(Date.now() - DEDUPE_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("engagement_events")
      .select("id")
      .eq("member_id", member.id)
      .eq("item_id", itemId)
      .eq("event_type", "listen")
      .gt("created_at", sinceIso)
      .maybeSingle();

    if (recent) {
      return NextResponse.json({ ok: true, recorded: false });
    }

    const { error } = await supabaseAdmin
      .from("engagement_events")
      .insert({ member_id: member.id, item_id: itemId, event_type: "listen" });

    if (error) throw new AppError("Impossible d'enregistrer cet événement.", 500);

    return NextResponse.json({ ok: true, recorded: true });
  } catch (error) {
    return errorResponse(error);
  }
}
