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

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) headers[MEMBER_TOKEN_HEADER] = options.token;

  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = (data as { error?: string } | null)?.error ?? "Une erreur est survenue.";
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}
