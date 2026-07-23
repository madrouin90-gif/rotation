import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, clearAdminSessionCookie } from "@/lib/adminAuth";
import { errorResponse } from "@/lib/errors";
import { revokeSuperAdminSessionByToken } from "@/lib/sessions";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

    if (token) {
      await revokeSuperAdminSessionByToken(token);
    }
    await clearAdminSessionCookie();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
