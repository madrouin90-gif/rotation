import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireMemberInGroup } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { normalizeGroupCode } from "@/lib/codes";
import type { HistoryEvent, Item } from "@/types";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await params;
    const code = normalizeGroupCode(rawCode);
    const { group } = await requireMemberInGroup(request, code);

    const url = new URL(request.url);
    const memberIdsParam = url.searchParams.get("memberIds");
    const genresParam = url.searchParams.get("genres");
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    const limitParam = url.searchParams.get("limit");

    let limit = DEFAULT_LIMIT;
    if (limitParam) {
      const parsedLimit = Number.parseInt(limitParam, 10);
      if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
        throw new AppError("Limite invalide.");
      }
      limit = Math.min(parsedLimit, MAX_LIMIT);
    }

    const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

    // Bornes construites directement en UTC (pas de Date + getHours/setHours, qui
    // dépendent du fuseau horaire local du serveur et décaleraient la journée).
    let fromIso: string | undefined;
    if (fromParam) {
      if (!DATE_ONLY_RE.test(fromParam) || Number.isNaN(new Date(fromParam).getTime())) {
        throw new AppError("Date de début invalide.");
      }
      fromIso = `${fromParam}T00:00:00.000Z`;
    }

    let toIso: string | undefined;
    if (toParam) {
      if (!DATE_ONLY_RE.test(toParam) || Number.isNaN(new Date(toParam).getTime())) {
        throw new AppError("Date de fin invalide.");
      }
      toIso = `${toParam}T23:59:59.999Z`;
    }

    const { data: memberRows, error: membersError } = await supabaseAdmin
      .from("members")
      .select("id, pseudo, avatar_emoji, avatar_color")
      .eq("group_id", group.id);

    if (membersError || !memberRows) {
      throw new AppError("Impossible de charger les membres du groupe.", 500);
    }

    const memberMap = new Map(memberRows.map((m) => [m.id, m]));
    const groupMemberIds = memberRows.map((m) => m.id);

    let filterMemberIds = groupMemberIds;
    if (memberIdsParam) {
      const requested = memberIdsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const valid = requested.filter((id) => memberMap.has(id));
      if (valid.length > 0) filterMemberIds = valid;
    }

    // Filtre genre appliqué en 2 temps : les genres vivent sur `items`, pas sur `share_events`,
    // donc on résout d'abord les item_id correspondants avant de filtrer les événements.
    let filterItemIds: string[] | null = null;
    if (genresParam) {
      const requestedGenres = genresParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (requestedGenres.length > 0) {
        const { data: matchingItems, error: itemsError } = await supabaseAdmin
          .from("items")
          .select("id")
          .in("member_id", filterMemberIds.length > 0 ? filterMemberIds : ["00000000-0000-0000-0000-000000000000"])
          .overlaps("genres", requestedGenres);

        if (itemsError) {
          throw new AppError("Impossible de filtrer par genre.", 500);
        }

        filterItemIds = (matchingItems ?? []).map((i) => i.id);
        if (filterItemIds.length === 0) {
          return NextResponse.json({ events: [] });
        }
      }
    }

    let query = supabaseAdmin
      .from("share_events")
      .select("id, occurred_at, member_id, item_id, items(*)")
      .in("member_id", filterMemberIds.length > 0 ? filterMemberIds : ["00000000-0000-0000-0000-000000000000"])
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (fromIso) query = query.gte("occurred_at", fromIso);
    if (toIso) query = query.lte("occurred_at", toIso);
    if (filterItemIds) query = query.in("item_id", filterItemIds);

    const { data: eventRows, error: eventsError } = await query;

    if (eventsError) {
      throw new AppError("Impossible de charger l'historique.", 500);
    }

    const events: HistoryEvent[] = (eventRows ?? [])
      .map((row) => {
        const member = memberMap.get(row.member_id);
        const item = row.items as unknown as Item;
        if (!member || !item) return null;
        return {
          id: row.id,
          occurredAt: row.occurred_at,
          item,
          member: {
            id: member.id,
            pseudo: member.pseudo,
            avatarEmoji: member.avatar_emoji,
            avatarColor: member.avatar_color,
          },
        };
      })
      .filter((e): e is HistoryEvent => e !== null);

    return NextResponse.json({ events });
  } catch (error) {
    return errorResponse(error);
  }
}
