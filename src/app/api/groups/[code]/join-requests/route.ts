import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdminInGroup } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { normalizeGroupCode } from "@/lib/codes";
import type { PendingRequest } from "@/types";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await params;
    const code = normalizeGroupCode(rawCode);
    const { group } = await requireAdminInGroup(request, code);

    const { data, error } = await supabaseAdmin
      .from("members")
      .select("id, pseudo, avatar_emoji, avatar_color, created_at")
      .eq("group_id", group.id)
      .eq("approval_status", "pending")
      .order("created_at", { ascending: true });

    if (error) throw new AppError("Impossible de charger les demandes en attente.", 500);

    const requests: PendingRequest[] = (data ?? []).map((m) => ({
      id: m.id,
      pseudo: m.pseudo,
      avatarEmoji: m.avatar_emoji,
      avatarColor: m.avatar_color,
      createdAt: m.created_at,
    }));

    return NextResponse.json({ requests });
  } catch (error) {
    return errorResponse(error);
  }
}
