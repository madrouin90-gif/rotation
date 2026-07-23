import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { logAction } from "@/lib/auditLog";

export async function POST(request: Request) {
  try {
    const member = await requireMember(request);

    const { error } = await supabaseAdmin
      .from("members")
      .update({ discord_user_id: null, discord_username: null })
      .eq("id", member.id);

    if (error) throw new AppError("Impossible de délier ton compte Discord.", 500);

    await logAction({
      groupId: member.group_id,
      memberId: member.id,
      memberPseudo: member.pseudo,
      action: "discord_unlinked",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
