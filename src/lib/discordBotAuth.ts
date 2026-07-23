import "server-only";
import { timingSafeEqual } from "node:crypto";
import { AppError } from "@/lib/errors";

/** Vérifie le secret partagé avec le bot Discord (comparaison à temps constant). */
export function requireDiscordBot(request: Request): void {
  const secret = process.env.DISCORD_BOT_SECRET;
  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";

  if (!secret || !provided) {
    throw new AppError("Non autorisé.", 401);
  }

  const secretBuf = Buffer.from(secret);
  const providedBuf = Buffer.from(provided);

  const valid = secretBuf.length === providedBuf.length && timingSafeEqual(secretBuf, providedBuf);
  if (!valid) {
    throw new AppError("Non autorisé.", 401);
  }
}
