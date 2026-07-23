import "server-only";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";

export const ADMIN_SESSION_COOKIE = "rotation_admin_session";

export interface SuperAdmin {
  id: string;
  email: string;
}

export async function setAdminSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

/** Vérifie la session super-admin via le cookie httpOnly (jamais un header, contrairement aux membres). */
export async function requireSuperAdmin(): Promise<SuperAdmin> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) {
    throw new AppError("Non authentifié.", 401);
  }

  const { data, error } = await supabaseAdmin
    .from("super_admins")
    .select("id, email")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) {
    throw new AppError("Session invalide ou expirée.", 401);
  }

  return data;
}
