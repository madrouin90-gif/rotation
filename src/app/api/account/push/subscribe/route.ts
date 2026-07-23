import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";

interface SubscribeBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

export async function POST(request: Request) {
  try {
    const member = await requireMember(request);
    const body = (await request.json()) as SubscribeBody;
    const endpoint = body.endpoint?.trim() ?? "";
    const p256dh = body.keys?.p256dh?.trim() ?? "";
    const auth = body.keys?.auth?.trim() ?? "";

    if (!endpoint || !p256dh || !auth) {
      throw new AppError("Abonnement push invalide.");
    }

    // upsert sur `endpoint` : un même appareil peut se réabonner (ex. après avoir changé de
    // membre sur ce navigateur) — on met simplement à jour le membre propriétaire.
    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert({ member_id: member.id, endpoint, p256dh, auth }, { onConflict: "endpoint" });

    if (error) throw new AppError("Impossible d'enregistrer cet abonnement.", 500);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
