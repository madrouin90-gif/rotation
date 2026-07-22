import { spotifyAppUri } from "@/lib/spotifyUri";
import type { SpotifyItemType } from "@/types";

interface ListenButtonProps {
  type: SpotifyItemType;
  spotifyId: string;
  className?: string;
}

export function ListenButton({ type, spotifyId, className = "" }: ListenButtonProps) {
  return (
    <a
      href={spotifyAppUri(type, spotifyId)}
      onClick={(e) => e.stopPropagation()}
      title="Écouter sur Spotify"
      aria-label="Écouter sur Spotify"
      className={`w-9 h-9 rounded-full bg-black/50 hover:bg-accent flex items-center justify-center text-white transition cursor-pointer backdrop-blur-sm ${className}`}
    >
      <span className="text-sm translate-x-[1px]">▶</span>
    </a>
  );
}
