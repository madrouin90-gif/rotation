import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { errorResponse } from "@/lib/errors";

export async function GET() {
  try {
    const admin = await requireSuperAdmin();
    return NextResponse.json({ email: admin.email });
  } catch (error) {
    return errorResponse(error);
  }
}
