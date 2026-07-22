import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { getGroupById } from "@/lib/groupState";
import { AppError, errorResponse } from "@/lib/errors";
import type { ArchiveEntry } from "@/types";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: targetMemberId } = await params;
    const viewer = await requireMember(request);

    const { data: target, error: targetError } = await supabaseAdmin
      .from("members")
      .select("id, group_id, pseudo")
      .eq("id", targetMemberId)
      .maybeSingle();

    if (targetError || !target || target.group_id !== viewer.group_id) {
      throw new AppError("Ce membre n'existe pas dans ton groupe.", 404);
    }

    const isOwnArchive = target.id === viewer.id;
    if (!isOwnArchive) {
      const group = await getGroupById(viewer.group_id);
      if (!group.settings.archives_visible) {
        throw new AppError("Les archives des membres ne sont pas visibles dans ce groupe.", 403);
      }
    }

    const { data: items, error: itemsError } = await supabaseAdmin
      .from("items")
      .select("id, member_id, spotify_id, spotify_url, type, title, artist_name, artwork_url, genres, first_added_at")
      .eq("member_id", target.id)
      .order("first_added_at", { ascending: false });

    if (itemsError || !items) {
      throw new AppError("Impossible de charger l'archive.", 500);
    }

    const { data: activeShares, error: sharesError } = await supabaseAdmin
      .from("shares")
      .select("id, item_id, rank, note, added_at")
      .eq("member_id", target.id);

    if (sharesError) {
      throw new AppError("Impossible de charger les slots actifs.", 500);
    }

    const activeByItemId = new Map((activeShares ?? []).map((s) => [s.item_id, s]));

    const entries: ArchiveEntry[] = items.map((item) => {
      const active = activeByItemId.get(item.id);
      return {
        item,
        isActive: Boolean(active),
        activeShare: active
          ? { id: active.id, rank: active.rank, note: active.note, added_at: active.added_at }
          : undefined,
      };
    });

    return NextResponse.json({ pseudo: target.pseudo, entries });
  } catch (error) {
    return errorResponse(error);
  }
}
