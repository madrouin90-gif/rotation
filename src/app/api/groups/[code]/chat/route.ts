import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireMemberInGroup } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";
import { normalizeGroupCode } from "@/lib/codes";
import { logAction } from "@/lib/auditLog";
import type { ChatEntry, SpotifyItemType } from "@/types";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 300;

interface CommentRow {
  id: string;
  body: string;
  created_at: string;
  member_id: string;
  members: { pseudo: string; avatar_emoji: string; avatar_color: string };
  items: { id: string; title: string; type: SpotifyItemType; spotify_id: string; member_id: string };
}

interface MessageRow {
  id: string;
  body: string;
  created_at: string;
  member_id: string;
  members: { pseudo: string; avatar_emoji: string; avatar_color: string };
}

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await params;
    const code = normalizeGroupCode(rawCode);
    const { group } = await requireMemberInGroup(request, code);

    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get("limit"));
    const limit = Number.isInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, MAX_LIMIT) : DEFAULT_LIMIT;

    const { data: memberRows, error: membersError } = await supabaseAdmin
      .from("members")
      .select("id")
      .eq("group_id", group.id);

    if (membersError || !memberRows) {
      throw new AppError("Impossible de charger les membres du groupe.", 500);
    }
    const memberIds = memberRows.map((m) => m.id);

    const { data: commentRows, error: commentsError } = await supabaseAdmin
      .from("comments")
      .select(
        "id, body, created_at, member_id, members(pseudo, avatar_emoji, avatar_color), items!inner(id, title, type, spotify_id, member_id)"
      )
      .in("items.member_id", memberIds.length > 0 ? memberIds : ["00000000-0000-0000-0000-000000000000"]);

    if (commentsError) {
      throw new AppError("Impossible de charger les commentaires.", 500);
    }

    const { data: messageRows, error: messagesError } = await supabaseAdmin
      .from("group_messages")
      .select("id, body, created_at, member_id, members(pseudo, avatar_emoji, avatar_color)")
      .eq("group_id", group.id);

    if (messagesError) {
      throw new AppError("Impossible de charger les messages du groupe.", 500);
    }

    const entries: ChatEntry[] = [
      ...((commentRows ?? []) as unknown as CommentRow[]).map((c) => ({
        id: c.id,
        kind: "comment" as const,
        body: c.body,
        createdAt: c.created_at,
        author: {
          id: c.member_id,
          pseudo: c.members.pseudo,
          avatarEmoji: c.members.avatar_emoji,
          avatarColor: c.members.avatar_color,
        },
        item: {
          id: c.items.id,
          title: c.items.title,
          type: c.items.type,
          spotifyId: c.items.spotify_id,
        },
      })),
      ...((messageRows ?? []) as unknown as MessageRow[]).map((m) => ({
        id: m.id,
        kind: "message" as const,
        body: m.body,
        createdAt: m.created_at,
        author: {
          id: m.member_id,
          pseudo: m.members.pseudo,
          avatarEmoji: m.members.avatar_emoji,
          avatarColor: m.members.avatar_color,
        },
        item: null,
      })),
    ];

    // Plus récent en premier : le panneau ne défile pas automatiquement, un nouveau
    // message doit donc apparaître en haut pour rester visible sans avoir à scroller.
    entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json({ entries: entries.slice(0, limit) });
  } catch (error) {
    return errorResponse(error);
  }
}

interface PostChatBody {
  body?: string;
}

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code: rawCode } = await params;
    const code = normalizeGroupCode(rawCode);
    const { member, group } = await requireMemberInGroup(request, code);

    const body = (await request.json()) as PostChatBody;
    const text = body.body?.trim() ?? "";

    if (text.length < 1 || text.length > 500) {
      throw new AppError("Le message doit contenir entre 1 et 500 caractères.");
    }

    const { data: created, error } = await supabaseAdmin
      .from("group_messages")
      .insert({ group_id: group.id, member_id: member.id, body: text })
      .select("id, created_at")
      .single();

    if (error || !created) {
      throw new AppError("Impossible d'envoyer le message.", 500);
    }

    await logAction({
      groupId: group.id,
      memberId: member.id,
      memberPseudo: member.pseudo,
      action: "group_message_added",
      metadata: { messageId: created.id },
    });

    const entry: ChatEntry = {
      id: created.id,
      kind: "message",
      body: text,
      createdAt: created.created_at,
      author: {
        id: member.id,
        pseudo: member.pseudo,
        avatarEmoji: member.avatar_emoji,
        avatarColor: member.avatar_color,
      },
      item: null,
    };

    return NextResponse.json(entry);
  } catch (error) {
    return errorResponse(error);
  }
}
