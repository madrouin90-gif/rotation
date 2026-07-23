import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireAdminInGroup, requireMemberInGroup } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { buildGroupState } from "@/lib/groupState";
import { DEFAULT_SETTINGS, validateSettingsPatch } from "@/lib/settings";
import { generateGroupCode, normalizeGroupCode } from "@/lib/codes";
import { logAction } from "@/lib/auditLog";
import type { GroupSettings } from "@/types";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await params;
    const code = normalizeGroupCode(rawCode);
    const { member, group } = await requireMemberInGroup(request, code);
    const state = await buildGroupState(group, member.id);
    return NextResponse.json(state);
  } catch (error) {
    return errorResponse(error);
  }
}

interface RenameBody {
  action: "rename";
  name: string;
}
interface RegenerateCodeBody {
  action: "regenerate_code";
}
interface UpdateSettingsBody {
  action: "update_settings";
  patch: Partial<GroupSettings>;
  dryRun?: boolean;
}
interface ResetDefaultsBody {
  action: "reset_defaults";
  dryRun?: boolean;
}
type PatchBody = RenameBody | RegenerateCodeBody | UpdateSettingsBody | ResetDefaultsBody;

export async function PATCH(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await params;
    const code = normalizeGroupCode(rawCode);
    const { member, group } = await requireAdminInGroup(request, code);
    const body = (await request.json()) as PatchBody;

    if (body.action === "rename") {
      const name = body.name?.trim() ?? "";
      if (name.length < 1 || name.length > 60) {
        throw new AppError("Le nom du groupe doit contenir entre 1 et 60 caractères.");
      }
      const { error } = await supabaseAdmin.from("groups").update({ name }).eq("id", group.id);
      if (error) throw new AppError("Impossible de renommer le groupe.", 500);

      await logAction({
        groupId: group.id,
        memberId: member.id,
        memberPseudo: member.pseudo,
        action: "group_renamed",
        metadata: { name },
      });

      return NextResponse.json({ name });
    }

    if (body.action === "regenerate_code") {
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
      if (error) throw new AppError("Impossible de régénérer le code du groupe.", 500);

      await logAction({
        groupId: group.id,
        memberId: member.id,
        memberPseudo: member.pseudo,
        action: "code_regenerated",
      });

      return NextResponse.json({ code: newCode });
    }

    if (body.action === "update_settings" || body.action === "reset_defaults") {
      const patch: Partial<GroupSettings> = body.action === "reset_defaults" ? DEFAULT_SETTINGS : body.patch ?? {};
      const validation = validateSettingsPatch(group.settings, patch);
      if (!validation.ok || !validation.merged) {
        throw new AppError(validation.errors.map((e) => e.message).join(" "));
      }
      const merged = validation.merged;

      if (merged.max_members < group.settings.max_members) {
        const { count } = await supabaseAdmin
          .from("members")
          .select("id", { count: "exact", head: true })
          .eq("group_id", group.id);
        if (count !== null && count !== undefined && merged.max_members < count) {
          throw new AppError(
            `Impossible de réduire le max de membres à ${merged.max_members} : le groupe compte déjà ${count} membres.`
          );
        }
      }

      const impact: { memberId: string; pseudo: string; sharesArchived: number }[] = [];
      const reducingSlots = merged.slots_per_member < group.settings.slots_per_member;

      if (reducingSlots) {
        const { data: members } = await supabaseAdmin
          .from("members")
          .select("id, pseudo")
          .eq("group_id", group.id);

        for (const m of members ?? []) {
          const { count } = await supabaseAdmin
            .from("shares")
            .select("id", { count: "exact", head: true })
            .eq("member_id", m.id)
            .gt("rank", merged.slots_per_member);
          if (count && count > 0) {
            impact.push({ memberId: m.id, pseudo: m.pseudo, sharesArchived: count });
          }
        }
      }

      const dryRun = body.dryRun ?? false;
      if (dryRun) {
        return NextResponse.json({ dryRun: true, impact, settings: merged });
      }

      let finalImpact = impact;
      if (reducingSlots) {
        const { data: reduced, error: reduceError } = await supabaseAdmin.rpc("apply_slot_reduction", {
          p_group_id: group.id,
          p_new_slots: merged.slots_per_member,
        });
        if (reduceError) {
          throw new AppError("Impossible d'appliquer la réduction du nombre de slots.", 500);
        }
        finalImpact = (reduced ?? []).map((r: { member_id: string; pseudo: string; shares_archived: number }) => ({
          memberId: r.member_id,
          pseudo: r.pseudo,
          sharesArchived: r.shares_archived,
        }));
      }

      const { error } = await supabaseAdmin.from("groups").update({ settings: merged }).eq("id", group.id);
      if (error) throw new AppError("Impossible de mettre à jour les paramètres du groupe.", 500);

      await logAction({
        groupId: group.id,
        memberId: member.id,
        memberPseudo: member.pseudo,
        action: "settings_updated",
        metadata: { resetToDefaults: body.action === "reset_defaults" },
      });

      return NextResponse.json({ dryRun: false, impact: finalImpact, settings: merged });
    }

    throw new AppError("Action inconnue.");
  } catch (error) {
    return errorResponse(error);
  }
}
