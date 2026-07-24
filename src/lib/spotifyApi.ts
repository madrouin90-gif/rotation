import "server-only";
import type { SpotifyItemType } from "@/types";

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Authentification "Client Credentials" de l'API officielle Spotify — pas de connexion
 * utilisateur, juste les identifiants de l'appli (developer.spotify.com). Optionnel :
 * sans SPOTIFY_CLIENT_ID/SECRET, toute suggestion de genre est un no-op silencieux (l'app
 * continue de fonctionner avec le tagging manuel uniquement).
 */
async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as { access_token: string; expires_in: number };
    // Marge de 60s pour ne jamais utiliser un token qui vient tout juste d'expirer.
    cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
    return cachedToken.token;
  } catch {
    return null;
  }
}

async function fetchArtistGenres(accessToken: string, artistId: string): Promise<string[]> {
  try {
    const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { genres?: string[] };
    return data.genres ?? [];
  } catch {
    return [];
  }
}

/**
 * Récupère les genres bruts de la taxonomie Spotify (ex. "dance pop", "modern rock") — le
 * genre n'existe officiellement qu'au niveau de l'artiste, donc pour une chanson/album on
 * retombe sur l'artiste principal. Best-effort, ne throw jamais.
 */
async function fetchRawGenres(type: SpotifyItemType, spotifyId: string): Promise<string[]> {
  const token = await getAccessToken();
  if (!token) return [];

  try {
    if (type === "artist") {
      return await fetchArtistGenres(token, spotifyId);
    }

    const endpoint = type === "track" ? "tracks" : "albums";
    const response = await fetch(`https://api.spotify.com/v1/${endpoint}/${spotifyId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];

    const data = (await response.json()) as { artists?: { id: string }[]; genres?: string[] };
    if (data.genres && data.genres.length > 0) return data.genres;

    const primaryArtistId = data.artists?.[0]?.id;
    if (!primaryArtistId) return [];
    return await fetchArtistGenres(token, primaryArtistId);
  } catch {
    return [];
  }
}

/**
 * Fait correspondre les genres bruts de Spotify (taxonomie fine, ex. "conscious hip hop",
 * "dance pop") aux tags configurés dans ce groupe (ex. "Hip-Hop/Rap", "Pop") par
 * correspondance de sous-chaîne insensible à la casse. Approximatif par nature (la
 * taxonomie Spotify a des centaines de micro-genres) — retourne au plus 3 suggestions,
 * à confirmer/ajuster par le membre plutôt qu'appliquées silencieusement.
 */
export function matchGenresToTags(rawGenres: string[], availableTags: string[]): string[] {
  const lowerRaw = rawGenres.map((g) => g.toLowerCase());
  const matched: string[] = [];

  for (const tag of availableTags) {
    const keywords = tag
      .toLowerCase()
      .split(/[/\s-]+/)
      .filter((k) => k.length > 2);

    const isMatch = lowerRaw.some((raw) => keywords.some((kw) => raw.includes(kw)));
    if (isMatch) matched.push(tag);
    if (matched.length >= 3) break;
  }

  return matched;
}

export async function suggestGenres(
  type: SpotifyItemType,
  spotifyId: string,
  availableTags: string[]
): Promise<string[]> {
  if (availableTags.length === 0) return [];
  const rawGenres = await fetchRawGenres(type, spotifyId);
  if (rawGenres.length === 0) return [];
  return matchGenresToTags(rawGenres, availableTags);
}
