import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireUser } from "@/lib/userAuth";
import { errorResponse } from "@/lib/errors";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);

    const { data: members, error } = await supabaseAdmin
      .from("members")
      .select("id, pseudo, groups(code, name)")
      .eq("user_id", user.id);

    if (error) throw error;

    const groups = (members ?? [])
      .filter((m) => m.groups)
      .map((m) => {
        const group = m.groups as unknown as { code: string; name: string };
        return { groupCode: group.code, groupName: group.name, memberId: m.id, pseudo: m.pseudo };
      });

    return NextResponse.json({
      email: user.email,
      emailVerified: user.emailVerifiedAt !== null,
      groups,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
