import { NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { getGroupById } from "@/lib/groupState";
import { AppError, errorResponse } from "@/lib/errors";
import { logAction } from "@/lib/auditLog";
import { notifyGroupEvent } from "@/lib/notifications";

const MAX_BODY_LENGTH = 500;

interface CreateCommentBody {
  itemId?: string;
  shareId?: string;
  body?: string;
}

export async function POST(request: Request) {
  try {
    const member = await requireMember(request);
    const body = (await request.json()) as CreateCommentBody;
    const itemId = body.itemId ?? "";
    const shareId = body.shareId ?? null;
    const commentBody = body.body?.trim() ?? "";

    if (!itemId) {
      throw new AppError("Commentaire invalide.");
    }
    if (commentBody.length < 1 || commentBody.length > MAX_BODY_LENGTH) {
      throw new AppError(`Le commentaire doit contenir entre 1 et ${MAX_BODY_LENGTH} caractères.`);
    }

    const { data: item, error: itemError } = await supabaseAdmin
      .from("items")
      .select("id, members!inner(group_id)")
      .eq("id", itemId)
      .maybeSingle();

    if (itemError || !item) {
      throw new AppError("Ce partage n'existe pas ou plus.", 404);
    }

    const itemGroupId = (item as unknown as { members: { group_id: string } }).members.group_id;
    if (itemGroupId !== member.group_id) {
      throw new AppError("Tu ne peux commenter que les partages de ton propre groupe.", 403);
    }

    let validShareId: string | null = null;
    if (shareId) {
      const { data: share } = await supabaseAdmin.from("shares").select("id, item_id").eq("id", shareId).maybeSingle();
      if (share && share.item_id === itemId) {
        validShareId = share.id;
      }
    }

    const { data: created, error } = await supabaseAdmin
      .from("comments")
      .insert({ item_id: itemId, share_id: validShareId, member_id: member.id, body: commentBody })
      .select("id, body, created_at, share_id")
      .single();

    if (error || !created) {
      throw new AppError("Impossible d'enregistrer le commentaire.", 500);
    }

    await logAction({
      groupId: member.group_id,
      memberId: member.id,
      memberPseudo: member.pseudo,
      action: "comment_added",
      metadata: { itemId, commentId: created.id },
    });

    after(async () => {
      const group = await getGroupById(member.group_id);
      await notifyGroupEvent({
        group,
        eventType: "chat_activity",
        actorMemberId: member.id,
        title: `${member.pseudo} a commenté`,
        body: commentBody,
        url: validShareId ? `/g/${group.code}?share=${validShareId}` : `/g/${group.code}`,
      });
    });

    return NextResponse.json({
      id: created.id,
      body: created.body,
      createdAt: created.created_at,
      shareId: created.share_id,
      author: {
        id: member.id,
        pseudo: member.pseudo,
        avatarEmoji: member.avatar_emoji,
        avatarColor: member.avatar_color,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
