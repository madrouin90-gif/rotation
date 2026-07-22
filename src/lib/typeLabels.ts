import type { SpotifyItemType } from "@/types";

export function spotifyTypeLabelFr(type: SpotifyItemType): string {
  switch (type) {
    case "track":
      return "chanson";
    case "album":
      return "album";
    case "artist":
      return "artiste";
  }
}
