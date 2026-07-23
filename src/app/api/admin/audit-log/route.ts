import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { errorResponse } from "@/lib/errors";
import { normalizeGroupCode } from "@/lib/codes";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const groupCodeParam = searchParams.get("groupCode");
    const limitParam = Number(searchParams.get("limit"));
    const limit = Number.isInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, MAX_LIMIT) : DEFAULT_LIMIT;

    let groupId: string | null = null;
    if (groupCodeParam) {
      const code = normalizeGroupCode(groupCodeParam);
      const { data: group } = await supabaseAdmin.from("groups").select("id").eq("code", code).maybeSingle();
      groupId = group?.id ?? null;
      if (!groupId) {
        return NextResponse.json({ entries: [] });
      }
    }

    let query = supabaseAdmin
      .from("audit_log")
      .select("id, group_id, member_pseudo, action, metadata, created_at, groups(name, code)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (groupId) {
      query = query.eq("group_id", groupId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const entries = (data ?? []).map((row) => {
      const group = row.groups as unknown as { name: string; code: string } | null;
      return {
        id: row.id,
        action: row.action,
        metadata: row.metadata,
        memberPseudo: row.member_pseudo,
        groupName: group?.name ?? null,
        groupCode: group?.code ?? null,
        createdAt: row.created_at,
      };
    });

    return NextResponse.json({ entries });
  } catch (error) {
    return errorResponse(error);
  }
}
