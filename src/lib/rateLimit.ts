import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { AppError } from "@/lib/errors";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const limiters = new Map<string, Ratelimit>();

function getLimiter(bucket: string, limit: number, windowSeconds: number): Ratelimit | null {
  if (!redis) return null;

  const cacheKey = `${bucket}:${limit}:${windowSeconds}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: `rotation:${bucket}`,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/**
 * Limite le nombre de requêtes par IP pour un "bucket" donné. No-op silencieux si les
 * variables UPSTASH_REDIS_REST_URL/TOKEN sont absentes (dev local sans compte Upstash).
 * En cas d'échec de l'appel à Redis (panne, réseau), on laisse passer plutôt que de
 * bloquer tout le monde — le rate limiting est une protection secondaire, pas la base
 * de la sécurité de l'app.
 */
export async function enforceRateLimit(
  request: Request,
  bucket: string,
  limit: number,
  windowSeconds: number
): Promise<void> {
  const limiter = getLimiter(bucket, limit, windowSeconds);
  if (!limiter) return;

  try {
    const { success } = await limiter.limit(getClientIp(request));
    if (!success) {
      throw new AppError("Trop de requêtes. Réessaie dans un instant.", 429);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("enforceRateLimit failed, laisse passer", error);
  }
}
