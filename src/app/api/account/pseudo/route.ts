import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { AppError, errorResponse } from "@/lib/errors";

interface SetPseudoBody {
  pseudo?: string;
}

export async function POST(request: Request) {
  try {
    const member = await requireMember(request);
    const body = (await request.json()) as SetPseudoBody;
    const pseudo = body.pseudo?.trim() ?? "";

    if (pseudo.length < 1 || pseudo.length > 24) {
      throw new AppError("Ton pseudo doit contenir entre 1 et 24 caractères.");
    }

    const { data: groupMembers, error: groupMembersError } = await supabaseAdmin
      .from("members")
      .select("id, pseudo")
      .eq("group_id", member.group_id);

    if (groupMembersError || !groupMembers) {
      throw new AppError("Impossible de vérifier les pseudos du groupe.", 500);
    }

    const taken = groupMembers.some(
      (m) => m.id !== member.id && m.pseudo.toLowerCase() === pseudo.toLowerCase()
    );
    if (taken) {
      throw new AppError("Ce pseudo est déjà pris dans ce groupe.");
    }

    const { error } = await supabaseAdmin.from("members").update({ pseudo }).eq("id", member.id);
    if (error) throw new AppError("Impossible de mettre à jour ton pseudo.", 500);

    return NextResponse.json({ ok: true, pseudo });
  } catch (error) {
    return errorResponse(error);
  }
}
