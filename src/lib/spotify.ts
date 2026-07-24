import type { SpotifyItemType } from "@/types";
import { AppError } from "@/lib/errors";

export interface ParsedSpotifyLink {
  type: SpotifyItemType;
  spotifyId: string;
  canonicalUrl: string;
}

const SPOTIFY_URL_RE =
  /open\.spotify\.com\/(?:intl-[a-z]{2,3}\/)?(track|album|artist)\/([A-Za-z0-9]+)/i;

export function parseSpotifyUrl(url: string): ParsedSpotifyLink | null {
  const trimmed = url.trim();
  const match = trimmed.match(SPOTIFY_URL_RE);
  if (!match) return null;

  const type = match[1].toLowerCase() as SpotifyItemType;
  const spotifyId = match[2];

  return {
    type,
    spotifyId,
    canonicalUrl: `https://open.spotify.com/${type}/${spotifyId}`,
  };
}

export interface SpotifyOEmbed {
  title: string;
  artistName: string | null;
  artworkUrl: string | null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/**
 * Extrait le nom d'artiste depuis la balise `og:description` de la page Spotify — pour une
 * piste/album, son format est "Artiste · Album/album · ... " (le premier segment est
 * toujours l'artiste). Pour un artiste, cette balise ne contient pas de nom ("Artist · N
 * auditeurs") : le titre oEmbed est déjà le nom de l'artiste, donc toujours null ici.
 */
export function extractArtistFromOgDescription(
  ogDescription: string | null,
  type: SpotifyItemType
): string | null {
  if (!ogDescription || type === "artist") return null;
  const first = ogDescription.split(" · ")[0]?.trim();
  return first || null;
}

/**
 * L'oEmbed public de Spotify ne fournit aucun champ artiste distinct (title est le titre
 * brut, ex. "Never Gonna Give You Up" — jamais "Titre - Artiste") : on va chercher le nom
 * sur la page Spotify elle-même, toujours sans clé API. Best-effort — ne fait jamais
 * échouer l'ajout du partage si Spotify change son HTML ou bloque la requête.
 */
async function fetchOgDescription(canonicalUrl: string): Promise<string | null> {
  try {
    const response = await fetch(canonicalUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RotationBot/1.0)" },
    });
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/<meta property="og:description" content="([^"]*)"/);
    return match ? decodeHtmlEntities(match[1]) : null;
  } catch {
    return null;
  }
}

export async function fetchSpotifyOEmbed(canonicalUrl: string, type: SpotifyItemType): Promise<SpotifyOEmbed> {
  const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(canonicalUrl)}`;

  let response: Response;
  try {
    response = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new AppError(
      "Impossible de récupérer les informations Spotify pour ce lien. Vérifie ta connexion et réessaie."
    );
  }

  if (!response.ok) {
    throw new AppError(
      "Ce lien Spotify semble invalide ou introuvable. Vérifie qu'il pointe bien vers une chanson, un album ou un artiste public."
    );
  }

  const data = (await response.json()) as { title?: string; thumbnail_url?: string };
  if (!data.title) {
    throw new AppError("Impossible de lire les informations de ce lien Spotify.");
  }

  const ogDescription = await fetchOgDescription(canonicalUrl);
  const artistName = extractArtistFromOgDescription(ogDescription, type);

  return {
    title: data.title,
    artistName,
    artworkUrl: data.thumbnail_url ?? null,
  };
}
