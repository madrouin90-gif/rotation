import { NextResponse, after } from "next/server";
import { requireMember } from "@/lib/auth";
import { getGroupById } from "@/lib/groupState";
import { errorResponse } from "@/lib/errors";
import { logAction } from "@/lib/auditLog";
import { placeShareForMember } from "@/lib/shareActions";
import { notifyGroupEvent } from "@/lib/notifications";

interface CreateShareBody {
  spotifyUrl?: string;
  note?: string;
  replaceRank?: number;
  genres?: string[];
}

export async function POST(request: Request) {
  try {
    const member = await requireMember(request);
    const group = await getGroupById(member.group_id);

    const body = (await request.json()) as CreateShareBody;
    const replaceRank = body.replaceRank;

    const outcome = await placeShareForMember(member, group, {
      spotifyUrl: body.spotifyUrl?.trim() ?? "",
      note: body.note,
      replaceRank,
      genres: body.genres,
    });

    if (outcome.status === "slots_full") {
      return NextResponse.json(
        {
          error: "Tes slots sont tous pleins. Choisis un partage à remplacer.",
          slotsFull: true,
        },
        { status: 409 }
      );
    }

    await logAction({
      groupId: member.group_id,
      memberId: member.id,
      memberPseudo: member.pseudo,
      action: replaceRank !== undefined ? "share_replaced" : "share_added",
      metadata: { rank: outcome.rank, title: outcome.title },
    });

    after(() =>
      notifyGroupEvent({
        group,
        eventType: "share_activity",
        actorMemberId: member.id,
        title: replaceRank !== undefined ? `${member.pseudo} a remplacé un partage` : `${member.pseudo} a partagé`,
        body: outcome.title,
        url: `/g/${group.code}`,
      })
    );

    return NextResponse.json({ ok: true, rank: outcome.rank });
  } catch (error) {
    return errorResponse(error);
  }
}
