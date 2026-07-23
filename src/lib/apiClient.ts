export const MEMBER_TOKEN_HEADER = "x-member-token";

export class ApiError extends Error {
  status: number;
  extra: unknown;

  constructor(message: string, status: number, extra?: unknown) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

// Cache mémoire par URL des réponses GET avec ETag : évite de retransmettre/reparser
// tout le payload quand le serveur répond 304 (rien de changé depuis le dernier poll).
const etagCache = new Map<string, { etag: string; data: unknown }>();

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) headers[MEMBER_TOKEN_HEADER] = options.token;

  const cached = method === "GET" ? etagCache.get(path) : undefined;
  if (cached) headers["If-None-Match"] = cached.etag;

  const response = await fetch(path, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 304 && cached) {
    return cached.data as T;
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = (data as { error?: string } | null)?.error ?? "Une erreur est survenue.";
    throw new ApiError(message, response.status, data);
  }

  if (method === "GET") {
    const etag = response.headers.get("etag");
    if (etag) {
      etagCache.set(path, { etag, data });
    } else {
      etagCache.delete(path);
    }
  }

  return data as T;
}
