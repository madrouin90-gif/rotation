import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { errorResponse, AppError } from "@/lib/errors";
import { mergeSettings } from "@/lib/settings";

export async function GET() {
  try {
    await requireSuperAdmin();

    const { data: groups, error: groupsError } = await supabaseAdmin
      .from("groups")
      .select("id, name, code, settings, created_at")
      .order("created_at", { ascending: false });

    if (groupsError) throw new AppError("Impossible de charger les groupes.", 500);

    const groupIds = (groups ?? []).map((g) => g.id);
    const { data: memberRows, error: membersError } = await supabaseAdmin
      .from("members")
      .select("group_id, approval_status")
      .in("group_id", groupIds.length > 0 ? groupIds : ["00000000-0000-0000-0000-000000000000"]);

    if (membersError) throw new AppError("Impossible de charger les membres.", 500);

    const countByGroup = new Map<string, { approved: number; pending: number }>();
    for (const m of memberRows ?? []) {
      const entry = countByGroup.get(m.group_id) ?? { approved: 0, pending: 0 };
      if (m.approval_status === "approved") entry.approved += 1;
      else entry.pending += 1;
      countByGroup.set(m.group_id, entry);
    }

    const result = (groups ?? []).map((g) => {
      const settings = mergeSettings(g.settings);
      const counts = countByGroup.get(g.id) ?? { approved: 0, pending: 0 };
      return {
        id: g.id,
        name: g.name,
        code: g.code,
        isPublic: settings.is_public,
        memberCount: counts.approved,
        pendingCount: counts.pending,
        createdAt: g.created_at,
      };
    });

    return NextResponse.json({ groups: result });
  } catch (error) {
    return errorResponse(error);
  }
}
