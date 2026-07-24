import "server-only";
import { AppError } from "@/lib/errors";
import { findUserSession } from "@/lib/sessions";

export const USER_TOKEN_HEADER = "x-user-token";

export interface AuthedUser {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
}

/**
 * Récupère le compte utilisateur authentifié via le header x-user-token.
 * Complètement indépendant de requireMember (src/lib/auth.ts) : un token
 * utilisateur n'a jamais accès direct aux routes group-scopées existantes,
 * seulement aux endpoints /api/auth/* (signup, login, me, select-group).
 */
export async function requireUser(request: Request): Promise<AuthedUser> {
  const token = request.headers.get(USER_TOKEN_HEADER);
  if (!token) {
    throw new AppError("Authentification manquante. Connecte-toi avec ton compte.", 401);
  }

  const user = await findUserSession(token);
  if (!user) {
    throw new AppError("Session invalide ou expirée. Reconnecte-toi.", 401);
  }

  return { id: user.id, email: user.email, emailVerifiedAt: user.email_verified_at };
}
