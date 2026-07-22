import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { mergeSettings } from "@/lib/settings";
import type { Group, GroupState, Item, MemberWithShares, ReactionSummary } from "@/types";

export async function getGroupById(groupId: string): Promise<Group> {
  const { data, error } = await supabaseAdmin
    .from("groups")
    .select("id, name, code, settings, created_at")
    .eq("id", groupId)
    .maybeSingle();

  if (error || !data) {
    throw new AppError("Ce groupe n'existe pas ou plus.", 404);
  }

  return { ...data, settings: mergeSettings(data.settings) };
}

interface ShareRow {
  id: string;
  member_id: string;
  item_id: string;
  rank: number;
  note: string | null;
  added_at: string;
  items: Item;
}

export async function buildGroupState(group: Group, viewerMemberId: string): Promise<GroupState> {
  const { data: memberRows, error: membersError } = await supabaseAdmin
    .from("members")
    .select("id, group_id, pseudo, avatar_emoji, avatar_color, is_admin, created_at")
    .eq("group_id", group.id)
    .order("created_at", { ascending: true });

  if (membersError || !memberRows) {
    throw new AppError("Impossible de charger les membres du groupe.", 500);
  }

  const memberIds = memberRows.map((m) => m.id);

  const { data: shareRows, error: sharesError } = await supabaseAdmin
    .from("shares")
    .select("id, member_id, item_id, rank, note, added_at, items(*)")
    .in("member_id", memberIds.length > 0 ? memberIds : ["00000000-0000-0000-0000-000000000000"])
    .order("rank", { ascending: true });

  if (sharesError) {
    throw new AppError("Impossible de charger les partages du groupe.", 500);
  }

  const shares = (shareRows ?? []) as unknown as ShareRow[];
  const shareIds = shares.map((s) => s.id);

  const { data: reactionRows, error: reactionsError } = await supabaseAdmin
    .from("reactions")
    .select("id, share_id, member_id, emoji")
    .in("share_id", shareIds.length > 0 ? shareIds : ["00000000-0000-0000-0000-000000000000"]);

  if (reactionsError) {
    throw new AppError("Impossible de charger les réactions.", 500);
  }

  const reactions = reactionRows ?? [];
  const allowedEmojis = new Set(group.settings.reaction_emojis);

  const reactionsByShare = new Map<string, ReactionSummary[]>();
  for (const share of shares) {
    const shareReactions = reactions.filter((r) => r.share_id === share.id && allowedEmojis.has(r.emoji));
    const byEmoji = new Map<string, { count: number; reactedByMe: boolean }>();
    for (const r of shareReactions) {
      const entry = byEmoji.get(r.emoji) ?? { count: 0, reactedByMe: false };
      entry.count += 1;
      if (r.member_id === viewerMemberId) entry.reactedByMe = true;
      byEmoji.set(r.emoji, entry);
    }
    reactionsByShare.set(
      share.id,
      Array.from(byEmoji.entries()).map(([emoji, v]) => ({ emoji, count: v.count, reactedByMe: v.reactedByMe }))
    );
  }

  const members: MemberWithShares[] = memberRows.map((m) => ({
    ...m,
    shares: shares
      .filter((s) => s.member_id === m.id)
      .sort((a, b) => a.rank - b.rank)
      .map((s) => ({
        id: s.id,
        member_id: s.member_id,
        item_id: s.item_id,
        rank: s.rank,
        note: s.note,
        added_at: s.added_at,
        item: s.items,
        reactions: reactionsByShare.get(s.id) ?? [],
      })),
  }));

  const me = memberRows.find((m) => m.id === viewerMemberId);

  return {
    group: { id: group.id, name: group.name, code: group.code, settings: group.settings },
    members,
    me: { memberId: viewerMemberId, isAdmin: me?.is_admin ?? false },
  };
}

export { spotifyTypeLabelFr } from "@/lib/typeLabels";
