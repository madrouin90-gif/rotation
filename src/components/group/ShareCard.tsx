"use client";

import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { Avatar } from "@/components/ui/Avatar";
import { ListenButton } from "@/components/share/ListenButton";
import { RatingWidget } from "@/components/share/RatingWidget";
import { isShareNew, formatDateFr } from "@/lib/dates";
import type { GroupSettings, MemberWithShares, ShareWithReactions } from "@/types";

interface ShareCardProps {
  share: ShareWithReactions;
  member: Pick<MemberWithShares, "id" | "pseudo" | "avatar_emoji" | "avatar_color">;
  settings: GroupSettings;
  isMe: boolean;
  token: string;
  showOwnerAvatar?: boolean;
  showDate?: boolean;
  onOpenDetail: () => void;
  onRated: () => void;
  dragHandleAttributes?: DraggableAttributes;
  dragHandleListeners?: DraggableSyntheticListeners;
}

export function ShareCard({
  share,
  member,
  settings,
  isMe,
  token,
  showOwnerAvatar = true,
  showDate = false,
  onOpenDetail,
  onRated,
  dragHandleAttributes,
  dragHandleListeners,
}: ShareCardProps) {
  const { item } = share;
  const isTopPick = settings.highlight_top_pick && share.rank === 1;
  const isNew = isShareNew(share.added_at, settings.new_badge_days);
  const votesCount = item.rating?.votesCount ?? 0;

  return (
    <div
      className={`rounded-2xl overflow-hidden bg-surface-2 flex flex-col min-w-0 transition-shadow duration-200 ${
        isTopPick ? "ring-4 ring-accent shadow-2xl shadow-accent/40" : ""
      }`}
    >
      <div className="relative aspect-square shrink-0">
        <button
          type="button"
          onClick={onOpenDetail}
          className={`w-full h-full block ${
            dragHandleAttributes ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
          }`}
          data-drag-handle={dragHandleAttributes ? "true" : undefined}
          {...dragHandleAttributes}
          {...dragHandleListeners}
        >
          {item.artwork_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.artwork_url}
              alt={item.title}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              className="w-full h-full object-cover pointer-events-none"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl pointer-events-none">🎵</div>
          )}
        </button>

        {isTopPick && (
          <span className="absolute top-2 left-2 text-[10px] font-semibold tracking-wide uppercase bg-accent text-white px-2 py-0.5 rounded-full pointer-events-none shadow">
            🏆 Top pick
          </span>
        )}
        {isNew && (
          <span className="absolute top-2 right-2 text-[10px] font-medium tracking-wide uppercase bg-accent-2 text-white px-2 py-0.5 rounded-full pointer-events-none">
            Nouveau
          </span>
        )}
        {showOwnerAvatar && (
          <div className="absolute bottom-2 left-2">
            <Avatar emoji={member.avatar_emoji} color={member.avatar_color} size="sm" ring />
          </div>
        )}
        <ListenButton
          type={item.type}
          spotifyId={item.spotify_id}
          itemId={item.id}
          token={token}
          className="absolute bottom-2 right-2"
        />
      </div>

      <div className="p-3 flex flex-col gap-1.5 min-h-[92px]">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">{item.title}</p>
          <span className="text-[10px] text-muted shrink-0">#{share.rank}</span>
        </div>
        {item.artist_name && <p className="text-xs text-muted truncate">{item.artist_name}</p>}
        {item.genres.length > 0 && <p className="text-[11px] text-muted truncate">{item.genres.join(", ")}</p>}
        {showDate && <p className="text-[11px] text-muted">{formatDateFr(share.added_at)}</p>}
        {share.reactions.some((r) => r.count > 0) && (
          <div className="flex flex-wrap gap-1">
            {share.reactions
              .filter((r) => r.count > 0)
              .map((r) => (
                <span
                  key={r.emoji}
                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] ${
                    r.reactedByMe ? "bg-accent/20 text-foreground" : "bg-surface text-muted"
                  }`}
                >
                  {r.emoji} {r.count}
                </span>
              ))}
          </div>
        )}
        {votesCount > 0 && (
          <p className="text-xs text-accent">
            🏆 {item.rating!.scoreOn100}/100 · {votesCount} vote{votesCount > 1 ? "s" : ""}
          </p>
        )}
        {Boolean(share.listenersCount) && (
          <p className="text-xs text-muted">
            🎧 {share.listenersCount} membre{share.listenersCount! > 1 ? "s" : ""} l&apos;
            {share.listenersCount! > 1 ? "ont" : "a"} écouté
          </p>
        )}
        {!isMe && <RatingWidget itemId={item.id} token={token} myScore={item.rating?.myScore ?? null} onRated={onRated} />}
      </div>
    </div>
  );
}
