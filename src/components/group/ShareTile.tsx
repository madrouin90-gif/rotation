"use client";

import { Avatar } from "@/components/ui/Avatar";
import { isShareNew } from "@/lib/dates";
import type { GroupSettings, MemberWithShares, ShareWithReactions } from "@/types";

interface ShareTileProps {
  share: ShareWithReactions;
  member: Pick<MemberWithShares, "pseudo" | "avatar_emoji" | "avatar_color">;
  settings: GroupSettings;
  onClick: () => void;
}

export function ShareTile({ share, member, settings, onClick }: ShareTileProps) {
  const isTopPick = settings.highlight_top_pick && share.rank === 1;
  const isNew = isShareNew(share.added_at, settings.new_badge_days);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative aspect-square rounded-2xl overflow-hidden bg-surface-2 text-left transition-transform duration-200 hover:scale-[1.03] cursor-pointer ${
        isTopPick ? "ring-2 ring-accent shadow-lg shadow-accent/20" : ""
      }`}
    >
      {share.item.artwork_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={share.item.artwork_url}
          alt={share.item.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-4xl">🎵</div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {isTopPick && (
        <span className="absolute top-2 left-2 text-[10px] font-medium tracking-wide uppercase bg-accent text-white px-2 py-0.5 rounded-full">
          Top pick
        </span>
      )}

      {isNew && (
        <span className="absolute top-2 right-2 text-[10px] font-medium tracking-wide uppercase bg-accent-2 text-white px-2 py-0.5 rounded-full">
          Nouveau
        </span>
      )}

      <div className="absolute bottom-2 left-2">
        <Avatar emoji={member.avatar_emoji} color={member.avatar_color} size="sm" ring />
      </div>

      <div className="absolute bottom-2 right-2 text-[10px] text-white/70 font-medium bg-black/40 rounded-full px-1.5 py-0.5">
        #{share.rank}
      </div>
    </button>
  );
}
