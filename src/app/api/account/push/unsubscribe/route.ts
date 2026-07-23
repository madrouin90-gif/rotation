import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";

interface UnsubscribeBody {
  endpoint?: string;
}

export async function POST(request: Request) {
  try {
    const member = await requireMember(request);
    const body = (await request.json()) as UnsubscribeBody;
    const endpoint = body.endpoint?.trim() ?? "";

    if (!endpoint) {
      throw new AppError("Abonnement push invalide.");
    }

    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint)
      .eq("member_id", member.id);

    if (error) throw new AppError("Impossible de retirer cet abonnement.", 500);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
