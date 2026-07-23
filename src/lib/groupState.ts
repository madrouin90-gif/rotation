import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { mergeSettings } from "@/lib/settings";
import { computeRatingAggregate } from "@/lib/ratings";
import type { Comment, Group, GroupState, Item, MemberWithShares, ReactionSummary } from "@/types";

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
    .select("id, group_id, pseudo, avatar_emoji, avatar_color, is_admin, is_owner, is_active, created_at")
    .eq("group_id", group.id)
    .eq("approval_status", "approved")
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

  const itemIds = Array.from(new Set(shares.map((s) => s.item_id)));
  const { data: ratingRows, error: ratingsError } = await supabaseAdmin
    .from("ratings")
    .select("item_id, rater_member_id, score")
    .in("item_id", itemIds.length > 0 ? itemIds : ["00000000-0000-0000-0000-000000000000"]);

  if (ratingsError) {
    throw new AppError("Impossible de charger les notes.", 500);
  }

  const ratingsByItem = new Map<string, { rater_member_id: string; score: number }[]>();
  for (const r of ratingRows ?? []) {
    const list = ratingsByItem.get(r.item_id) ?? [];
    list.push(r);
    ratingsByItem.set(r.item_id, list);
  }

  interface CommentRow {
    id: string;
    item_id: string;
    share_id: string | null;
    body: string;
    created_at: string;
    member_id: string;
    members: { pseudo: string; avatar_emoji: string; avatar_color: string };
  }

  const { data: commentRows, error: commentsError } = await supabaseAdmin
    .from("comments")
    .select("id, item_id, share_id, body, created_at, member_id, members(pseudo, avatar_emoji, avatar_color)")
    .in("item_id", itemIds.length > 0 ? itemIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: true });

  if (commentsError) {
    throw new AppError("Impossible de charger les commentaires.", 500);
  }

  const commentsByItem = new Map<string, Comment[]>();
  for (const c of (commentRows ?? []) as unknown as CommentRow[]) {
    const list = commentsByItem.get(c.item_id) ?? [];
    list.push({
      id: c.id,
      body: c.body,
      createdAt: c.created_at,
      shareId: c.share_id,
      author: {
        id: c.member_id,
        pseudo: c.members.pseudo,
        avatarEmoji: c.members.avatar_emoji,
        avatarColor: c.members.avatar_color,
      },
    });
    commentsByItem.set(c.item_id, list);
  }

  const { data: favoriteRows, error: favoritesError } = await supabaseAdmin
    .from("favorites")
    .select("item_id")
    .eq("member_id", viewerMemberId)
    .in("item_id", itemIds.length > 0 ? itemIds : ["00000000-0000-0000-0000-000000000000"]);

  if (favoritesError) {
    throw new AppError("Impossible de charger les favoris.", 500);
  }

  const favoriteItemIds = new Set((favoriteRows ?? []).map((f) => f.item_id));

  // Rang d'apparition des membres basé sur la dernière mise à jour de leur liste
  // (dernier `added_at` parmi leurs partages actifs), le plus récent en premier.
  // Les membres sans partage actif restent en fin de liste, dans l'ordre d'arrivée.
  const lastUpdateByMember = new Map<string, string | null>();
  for (const m of memberRows) {
    const memberShares = shares.filter((s) => s.member_id === m.id);
    const last = memberShares.reduce<string | null>(
      (max, s) => (!max || s.added_at > max ? s.added_at : max),
      null
    );
    lastUpdateByMember.set(m.id, last);
  }

  const sortedMemberRows = [...memberRows].sort((a, b) => {
    const la = lastUpdateByMember.get(a.id);
    const lb = lastUpdateByMember.get(b.id);
    if (la && lb) return lb.localeCompare(la);
    if (la && !lb) return -1;
    if (!la && lb) return 1;
    return a.created_at.localeCompare(b.created_at);
  });

  const members: MemberWithShares[] = sortedMemberRows.map((m) => ({
    ...m,
    shares: shares
      .filter((s) => s.member_id === m.id)
      .sort((a, b) => a.rank - b.rank)
      .map((s) => {
        const itemRatings = ratingsByItem.get(s.item_id) ?? [];
        const aggregate = computeRatingAggregate(itemRatings.map((r) => r.score));
        const myRating = itemRatings.find((r) => r.rater_member_id === viewerMemberId);

        return {
          id: s.id,
          member_id: s.member_id,
          item_id: s.item_id,
          rank: s.rank,
          note: s.note,
          added_at: s.added_at,
          item: {
            ...s.items,
            rating: {
              average: aggregate?.average ?? 0,
              scoreOn100: aggregate?.scoreOn100 ?? 0,
              votesCount: aggregate?.votesCount ?? 0,
              myScore: myRating ? myRating.score : null,
            },
            comments: commentsByItem.get(s.item_id) ?? [],
            isFavorite: favoriteItemIds.has(s.item_id),
          },
          reactions: reactionsByShare.get(s.id) ?? [],
        };
      }),
  }));

  const me = memberRows.find((m) => m.id === viewerMemberId);

  // Requête séparée : on ne veut jamais que `password_hash`/`email` transitent dans la
  // liste `members` envoyée à tout le monde, seul le viewer a besoin de connaître son propre état.
  const { data: viewerRow } = await supabaseAdmin
    .from("members")
    .select("password_hash, email, email_verified_at")
    .eq("id", viewerMemberId)
    .maybeSingle();

  let pendingRequestsCount = 0;
  if (me?.is_admin) {
    const { count } = await supabaseAdmin
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", group.id)
      .eq("approval_status", "pending");
    pendingRequestsCount = count ?? 0;
  }

  return {
    group: { id: group.id, name: group.name, code: group.code, settings: group.settings },
    members,
    me: {
      memberId: viewerMemberId,
      isAdmin: me?.is_admin ?? false,
      isOwner: me?.is_owner ?? false,
      hasPassword: Boolean(viewerRow?.password_hash),
      email: viewerRow?.email ?? null,
      emailVerified: Boolean(viewerRow?.email_verified_at),
      pendingRequestsCount,
    },
  };
}

export { spotifyTypeLabelFr } from "@/lib/typeLabels";
