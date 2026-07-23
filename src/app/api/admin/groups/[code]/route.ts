import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { AppError, errorResponse } from "@/lib/errors";
import { generateGroupCode, normalizeGroupCode } from "@/lib/codes";
import { mergeSettings } from "@/lib/settings";

async function loadGroupByCode(code: string) {
  const { data, error } = await supabaseAdmin
    .from("groups")
    .select("id, name, code, settings, created_at")
    .eq("code", code)
    .maybeSingle();

  if (error || !data) {
    throw new AppError("Ce groupe n'existe pas ou plus.", 404);
  }
  return data;
}

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    await requireSuperAdmin();
    const { code: rawCode } = await params;
    const code = normalizeGroupCode(rawCode);
    const group = await loadGroupByCode(code);

    const { data: members, error: membersError } = await supabaseAdmin
      .from("members")
      .select("id, pseudo, avatar_emoji, avatar_color, is_admin, is_owner, is_active, approval_status, created_at")
      .eq("group_id", group.id)
      .order("created_at", { ascending: true });

    if (membersError) throw new AppError("Impossible de charger les membres.", 500);

    return NextResponse.json({
      group: { id: group.id, name: group.name, code: group.code, settings: mergeSettings(group.settings), createdAt: group.created_at },
      members: members ?? [],
    });
  } catch (error) {
    return errorResponse(error);
  }
}

interface RegenerateCodeBody {
  action: "regenerate_code";
}

export async function PATCH(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    await requireSuperAdmin();
    const { code: rawCode } = await params;
    const code = normalizeGroupCode(rawCode);
    const group = await loadGroupByCode(code);
    const body = (await request.json()) as RegenerateCodeBody;

    if (body.action !== "regenerate_code") {
      throw new AppError("Action inconnue.");
    }

    let newCode = "";
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = generateGroupCode();
      const { data: existing } = await supabaseAdmin.from("groups").select("id").eq("code", candidate).maybeSingle();
      if (!existing) {
        newCode = candidate;
        break;
      }
    }
    if (!newCode) throw new AppError("Impossible de générer un nouveau code, réessaie.", 500);

    const { error } = await supabaseAdmin.from("groups").update({ code: newCode }).eq("id", group.id);
    if (error) throw new AppError("Impossible de régénérer le code.", 500);

    return NextResponse.json({ code: newCode });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    await requireSuperAdmin();
    const { code: rawCode } = await params;
    const code = normalizeGroupCode(rawCode);
    const group = await loadGroupByCode(code);

    const { error } = await supabaseAdmin.from("groups").delete().eq("id", group.id);
    if (error) throw new AppError("Impossible de supprimer ce groupe.", 500);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
