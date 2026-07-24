"use client";

import { Avatar } from "@/components/ui/Avatar";
import { ListenButton } from "@/components/share/ListenButton";
import { formatTimeFr } from "@/lib/dates";
import type { MemberWithShares, ShareWithReactions } from "@/types";

interface ShareListRowProps {
  share: ShareWithReactions;
  member: Pick<MemberWithShares, "id" | "pseudo" | "avatar_emoji" | "avatar_color">;
  token: string;
  onOpenDetail: () => void;
}

export function ShareListRow({ share, member, token, onOpenDetail }: ShareListRowProps) {
  const { item } = share;
  const votesCount = item.rating?.votesCount ?? 0;

  return (
    <div className="w-full flex items-center gap-3 px-2.5 py-2 hover:bg-surface-2/70 transition">
      <button
        type="button"
        onClick={onOpenDetail}
        className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
      >
        {item.artwork_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.artwork_url} alt={item.title} className="w-14 h-14 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-surface flex items-center justify-center text-2xl shrink-0">
            🎵
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{item.title}</p>
          {item.artist_name && <p className="text-xs text-muted truncate">{item.artist_name}</p>}
          {item.genres.length > 0 && <p className="text-[11px] text-muted truncate">{item.genres.join(", ")}</p>}
        </div>
      </button>

      <div className="flex items-center gap-2 shrink-0">
        {votesCount > 0 && (
          <span className="hidden sm:inline text-xs text-accent">
            🏆 {item.rating!.scoreOn100}/100
          </span>
        )}
        <span className="text-[11px] text-muted hidden sm:inline">{formatTimeFr(share.added_at)}</span>
        <div className="flex items-center gap-1.5">
          <Avatar emoji={member.avatar_emoji} color={member.avatar_color} size="sm" ring />
          <span className="text-xs font-medium truncate max-w-[5rem] sm:max-w-[8rem]">{member.pseudo}</span>
        </div>
        <ListenButton type={item.type} spotifyId={item.spotify_id} itemId={item.id} token={token} />
      </div>
    </div>
  );
}
