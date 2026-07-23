import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/adminAuth";
import { errorResponse } from "@/lib/errors";

export async function POST() {
  try {
    await clearAdminSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
