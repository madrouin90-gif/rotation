import type { SpotifyItemType } from "@/types";

interface SpotifyEmbedPlayerProps {
  type: SpotifyItemType;
  spotifyId: string;
}

export function SpotifyEmbedPlayer({ type, spotifyId }: SpotifyEmbedPlayerProps) {
  const height = type === "track" ? 152 : 352;

  return (
    <iframe
      title="Lecteur Spotify"
      style={{ borderRadius: 16 }}
      src={`https://open.spotify.com/embed/${type}/${spotifyId}?theme=0`}
      width="100%"
      height={height}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
    />
  );
}
