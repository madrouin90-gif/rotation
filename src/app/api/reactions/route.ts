import { NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { getGroupById } from "@/lib/groupState";
import { AppError, errorResponse } from "@/lib/errors";
import { logAction } from "@/lib/auditLog";
import { notifyGroupEvent } from "@/lib/notifications";

interface ToggleReactionBody {
  shareId?: string;
  emoji?: string;
}

export async function POST(request: Request) {
  try {
    const member = await requireMember(request);
    const group = await getGroupById(member.group_id);
    const body = (await request.json()) as ToggleReactionBody;
    const shareId = body.shareId ?? "";
    const emoji = body.emoji ?? "";

    if (!shareId || !emoji) {
      throw new AppError("Réaction invalide.");
    }

    const { data: share, error: shareError } = await supabaseAdmin
      .from("shares")
      .select("id, member_id, members!inner(group_id)")
      .eq("id", shareId)
      .maybeSingle();

    if (shareError || !share) {
      throw new AppError("Ce partage n'existe pas ou plus.", 404);
    }

    const shareGroupId = (share as unknown as { members: { group_id: string } }).members.group_id;
    if (shareGroupId !== member.group_id) {
      throw new AppError("Tu ne peux réagir qu'aux partages de ton propre groupe.", 403);
    }

    const { data: existing } = await supabaseAdmin
      .from("reactions")
      .select("id")
      .eq("share_id", shareId)
      .eq("member_id", member.id)
      .eq("emoji", emoji)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin.from("reactions").delete().eq("id", existing.id);
      if (error) throw new AppError("Impossible de retirer la réaction.", 500);

      await logAction({
        groupId: member.group_id,
        memberId: member.id,
        memberPseudo: member.pseudo,
        action: "reaction_removed",
        metadata: { shareId, emoji },
      });

      return NextResponse.json({ ok: true, reacted: false });
    }

    if (!group.settings.reaction_emojis.includes(emoji)) {
      throw new AppError("Cet emoji n'est plus disponible comme réaction dans ce groupe.");
    }

    const { error } = await supabaseAdmin.from("reactions").insert({ share_id: shareId, member_id: member.id, emoji });
    if (error) throw new AppError("Impossible d'ajouter la réaction.", 500);

    await logAction({
      groupId: member.group_id,
      memberId: member.id,
      memberPseudo: member.pseudo,
      action: "reaction_added",
      metadata: { shareId, emoji },
    });

    after(() =>
      notifyGroupEvent({
        group,
        eventType: "reaction_added",
        actorMemberId: member.id,
        onlyMemberIds: [share.member_id],
        title: `${member.pseudo} a réagi ${emoji}`,
        body: "à l'un de tes partages",
        url: `/g/${group.code}?share=${shareId}`,
      })
    );

    return NextResponse.json({ ok: true, reacted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
