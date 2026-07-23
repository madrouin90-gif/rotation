import { apiFetch } from "@/lib/apiClient";
import { spotifyAppUri } from "@/lib/spotifyUri";
import type { SpotifyItemType } from "@/types";

interface ListenButtonProps {
  type: SpotifyItemType;
  spotifyId: string;
  itemId: string;
  token: string;
  className?: string;
}

export function ListenButton({ type, spotifyId, itemId, token, className = "" }: ListenButtonProps) {
  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    // Fire-and-forget : ne doit jamais retarder ni bloquer l'ouverture de Spotify.
    apiFetch("/api/engagement", { method: "POST", token, body: { itemId, eventType: "listen" } }).catch(() => {});
  }

  return (
    <a
      href={spotifyAppUri(type, spotifyId)}
      onClick={handleClick}
      data-no-pan="true"
      title="Écouter sur Spotify"
      aria-label="Écouter sur Spotify"
      className={`w-9 h-9 rounded-full bg-black/50 hover:bg-accent flex items-center justify-center text-white transition cursor-pointer backdrop-blur-sm ${className}`}
    >
      <span className="text-sm translate-x-[1px]">▶</span>
    </a>
  );
}
