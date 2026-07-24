export type SpotifyItemType = "track" | "album" | "artist";

export type SortMode = "member" | "date";

export type NotificationEventType = "share_activity" | "chat_activity" | "reaction_added" | "join_requested";

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
  genre_tags: string[];
  is_public: boolean;
  require_approval: boolean;
  notification_events: NotificationEventType[];
}

export interface Group {
  id: string;
  name: string;
  code: string;
  settings: GroupSettings;
  discord_guild_id: string | null;
  discord_channel_id: string | null;
  created_at: string;
}

export interface Member {
  id: string;
  group_id: string;
  pseudo: string;
  avatar_emoji: string;
  avatar_color: string;
  is_admin: boolean;
  is_active: boolean;
  is_owner: boolean;
  isOnline: boolean;
  created_at: string;
}

export interface RatingVote {
  id: string;
  pseudo: string;
  avatarEmoji: string;
  avatarColor: string;
  score: number;
}

export interface RatingInfo {
  average: number;
  scoreOn100: number;
  votesCount: number;
  myScore: number | null;
  /** Détail de qui a voté quoi, trié du score le plus élevé au plus bas. */
  votes: RatingVote[];
}

export interface CommentAuthor {
  id: string;
  pseudo: string;
  avatarEmoji: string;
  avatarColor: string;
}

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: CommentAuthor;
  shareId: string | null;
}

export interface ChatEntry {
  id: string;
  kind: "comment" | "message";
  body: string;
  createdAt: string;
  author: CommentAuthor;
  item: { id: string; title: string; type: SpotifyItemType; spotifyId: string } | null;
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
  genres: string[];
  first_added_at: string;
  rating?: RatingInfo;
  comments?: Comment[];
  isFavorite?: boolean;
}

export interface ListenerInfo {
  id: string;
  pseudo: string;
  avatarEmoji: string;
  avatarColor: string;
}

export interface Share {
  id: string;
  member_id: string;
  item_id: string;
  rank: number;
  note: string | null;
  added_at: string;
  item: Item;
  /** Membres (autres que toi) ayant écouté ce partage — seulement peuplé sur tes propres partages. */
  listeners?: ListenerInfo[];
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
  group: Pick<Group, "id" | "name" | "code" | "settings" | "discord_guild_id" | "discord_channel_id">;
  members: MemberWithShares[];
  me: {
    memberId: string;
    isAdmin: boolean;
    isOwner: boolean;
    hasPassword: boolean;
    email: string | null;
    emailVerified: boolean;
    discordUsername: string | null;
    pendingRequestsCount: number;
    unseenCount: number;
    lastSeenAt: string | null;
  };
}

export interface PendingRequest {
  id: string;
  pseudo: string;
  avatarEmoji: string;
  avatarColor: string;
  createdAt: string;
}

export interface PublicGroupSummary {
  code: string;
  name: string;
  memberCount: number;
  maxMembers: number;
  requireApproval: boolean;
}

export interface FavoriteEntry {
  item: Item;
  owner: {
    memberId: string;
    pseudo: string;
    avatarEmoji: string;
    avatarColor: string;
  };
  favoritedAt: string;
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
