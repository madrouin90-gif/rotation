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

/**
 * Titre oEmbed pour un artiste/album : souvent "Titre" seul (pas d'auteur distinct pour un artiste),
 * pour un titre de piste/album Spotify formate parfois "Titre - Artiste" via le champ title.
 */
function splitTitleArtist(rawTitle: string, type: SpotifyItemType): { title: string; artistName: string | null } {
  if (type === "artist") {
    return { title: rawTitle, artistName: null };
  }
  const parts = rawTitle.split(" - ");
  if (parts.length >= 2) {
    return { title: parts[0], artistName: parts.slice(1).join(" - ") };
  }
  return { title: rawTitle, artistName: null };
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

  const { title, artistName } = splitTitleArtist(data.title, type);

  return {
    title,
    artistName,
    artworkUrl: data.thumbnail_url ?? null,
  };
}
