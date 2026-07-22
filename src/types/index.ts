export type SpotifyItemType = "track" | "album" | "artist";

export type SortMode = "member" | "date";

export interface GroupSettings {
  slots_per_member: number;
  max_members: number;
  new_badge_days: number;
  note_max_length: number;
  reaction_emojis: string[];
  default_sort: SortMode;
  archives_visible: boolean;
  highlight_top_pick: boolean;
  allowed_types: SpotifyItemType[];
}

export interface Group {
  id: string;
  name: string;
  code: string;
  settings: GroupSettings;
  created_at: string;
}

export interface Member {
  id: string;
  group_id: string;
  pseudo: string;
  avatar_emoji: string;
  avatar_color: string;
  is_admin: boolean;
  created_at: string;
}

export interface RatingInfo {
  average: number;
  scoreOn100: number;
  votesCount: number;
  myScore: number | null;
}

export interface Item {
  id: string;
  member_id: string;
  spotify_id: string;
  spotify_url: string;
  type: SpotifyItemType;
  title: string;
  artist_name: string | null;
  artwork_url: string | null;
  first_added_at: string;
  rating?: RatingInfo;
}

export interface Share {
  id: string;
  member_id: string;
  item_id: string;
  rank: number;
  note: string | null;
  added_at: string;
  item: Item;
}

export interface Reaction {
  id: string;
  share_id: string;
  member_id: string;
  emoji: string;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface ShareWithReactions extends Share {
  reactions: ReactionSummary[];
}

export interface MemberWithShares extends Member {
  shares: ShareWithReactions[];
}

export interface GroupState {
  group: Pick<Group, "id" | "name" | "code" | "settings">;
  members: MemberWithShares[];
  me: {
    memberId: string;
    isAdmin: boolean;
  };
}

export interface ArchiveEntry {
  item: Item;
  isActive: boolean;
  activeShare?: {
    id: string;
    rank: number;
    note: string | null;
    added_at: string;
  };
}

export interface SpotifyPreview {
  type: SpotifyItemType;
  spotifyId: string;
  canonicalUrl: string;
  title: string;
  artistName: string | null;
  artworkUrl: string | null;
}

export interface PalmaresVote {
  memberId: string;
  pseudo: string;
  avatarEmoji: string;
  avatarColor: string;
  score: number;
}

export interface HistoryEvent {
  id: string;
  occurredAt: string;
  item: Item;
  member: {
    id: string;
    pseudo: string;
    avatarEmoji: string;
    avatarColor: string;
  };
}

export interface PalmaresEntry {
  item: Item;
  owner: {
    memberId: string;
    pseudo: string;
    avatarEmoji: string;
    avatarColor: string;
  };
  average: number;
  scoreOn100: number;
  votesCount: number;
  votes: PalmaresVote[];
}
