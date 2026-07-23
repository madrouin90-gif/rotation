import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { getGroupById } from "@/lib/groupState";
import { AppError, errorResponse } from "@/lib/errors";
import { logAction } from "@/lib/auditLog";

async function loadOwnedShare(shareId: string, memberId: string) {
  const { data, error } = await supabaseAdmin
    .from("shares")
    .select("id, member_id, item_id, rank")
    .eq("id", shareId)
    .maybeSingle();

  if (error || !data) {
    throw new AppError("Ce partage n'existe pas ou plus.", 404);
  }
  if (data.member_id !== memberId) {
    throw new AppError("Tu ne peux modifier que tes propres partages.", 403);
  }
  return data;
}

interface UpdateShareBody {
  note?: string;
  genres?: string[];
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const member = await requireMember(request);
    const owned = await loadOwnedShare(id, member.id);
    const group = await getGroupById(member.group_id);

    const body = (await request.json()) as UpdateShareBody;

    if (body.note !== undefined) {
      const note = body.note?.trim() ?? "";

      if (note.length > 0 && group.settings.note_max_length === 0) {
        throw new AppError("Les notes sont désactivées dans ce groupe.");
      }
      if (note.length > group.settings.note_max_length) {
        throw new AppError(`Ta note dépasse la limite de ${group.settings.note_max_length} caractères.`);
      }

      const { error } = await supabaseAdmin.from("shares").update({ note: note || null }).eq("id", id);
      if (error) throw new AppError("Impossible de mettre à jour la note.", 500);

      await logAction({
        groupId: member.group_id,
        memberId: member.id,
        memberPseudo: member.pseudo,
        action: "share_note_updated",
        metadata: { shareId: id },
      });
    }

    if (body.genres !== undefined) {
      const genres = Array.isArray(body.genres) ? body.genres.filter((g): g is string => typeof g === "string") : [];
      const invalidGenres = genres.filter((g) => !group.settings.genre_tags.includes(g));
      if (invalidGenres.length > 0) {
        throw new AppError(`Genre(s) inconnu(s) dans ce groupe : ${invalidGenres.join(", ")}.`);
      }

      const { error } = await supabaseAdmin.from("items").update({ genres }).eq("id", owned.item_id);
      if (error) throw new AppError("Impossible de mettre à jour les genres.", 500);

      await logAction({
        groupId: member.group_id,
        memberId: member.id,
        memberPseudo: member.pseudo,
        action: "share_genres_updated",
        metadata: { shareId: id, genres },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const member = await requireMember(request);
    await loadOwnedShare(id, member.id);

    const { data: deleted, error } = await supabaseAdmin.rpc("delete_share_compact", {
      p_share_id: id,
      p_member_id: member.id,
    });

    if (error) throw new AppError("Impossible de retirer ce partage.", 500);
    if (!deleted) throw new AppError("Ce partage n'existe pas ou plus.", 404);

    await logAction({
      groupId: member.group_id,
      memberId: member.id,
      memberPseudo: member.pseudo,
      action: "share_removed",
      metadata: { shareId: id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
