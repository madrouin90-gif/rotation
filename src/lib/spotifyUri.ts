import type { SpotifyItemType } from "@/types";

/** URI de deep-link vers l'app Spotify native (mobile et desktop), au lieu du lecteur web. */
export function spotifyAppUri(type: SpotifyItemType, spotifyId: string): string {
  return `spotify:${type}:${spotifyId}`;
}
