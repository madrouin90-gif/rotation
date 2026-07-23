import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/errors";
import { mergeSettings } from "@/lib/settings";
import { enforceRateLimit } from "@/lib/rateLimit";
import type { PublicGroupSummary } from "@/types";

// Pas d'authentification ici — c'est le point d'entrée public avant même de rejoindre un groupe.
export async function GET(request: Request) {
  try {
    await enforceRateLimit(request, "directory", 30, 60);

    const { data: groups, error: groupsError } = await supabaseAdmin
      .from("groups")
      .select("id, name, code, settings")
      .filter("settings->>is_public", "eq", "true");

    if (groupsError) throw groupsError;

    const groupIds = (groups ?? []).map((g) => g.id);
    const { data: memberRows, error: membersError } = await supabaseAdmin
      .from("members")
      .select("group_id")
      .in("group_id", groupIds.length > 0 ? groupIds : ["00000000-0000-0000-0000-000000000000"])
      .eq("approval_status", "approved");

    if (membersError) throw membersError;

    const countByGroup = new Map<string, number>();
    for (const m of memberRows ?? []) {
      countByGroup.set(m.group_id, (countByGroup.get(m.group_id) ?? 0) + 1);
    }

    const result: PublicGroupSummary[] = (groups ?? []).map((g) => {
      const settings = mergeSettings(g.settings);
      return {
        code: g.code,
        name: g.name,
        memberCount: countByGroup.get(g.id) ?? 0,
        maxMembers: settings.max_members,
        requireApproval: settings.require_approval,
      };
    });

    result.sort((a, b) => b.memberCount - a.memberCount);

    return NextResponse.json({ groups: result });
  } catch (error) {
    return errorResponse(error);
  }
}
