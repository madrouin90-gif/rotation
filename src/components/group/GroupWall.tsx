"use client";

import { MemberColumn } from "@/components/group/MemberColumn";
import { ShareCard } from "@/components/group/ShareCard";
import type { GroupSettings, MemberWithShares, SortMode } from "@/types";

interface GroupWallProps {
  members: MemberWithShares[];
  settings: GroupSettings;
  sortMode: SortMode;
  viewerMemberId: string;
  token: string;
  onSelectShare: (shareId: string) => void;
  onReorder: (orderedShareIds: string[]) => void;
  onRated: () => void;
  onAddShare: () => void;
}

export function GroupWall({
  members,
  settings,
  sortMode,
  viewerMemberId,
  token,
  onSelectShare,
  onReorder,
  onRated,
  onAddShare,
}: GroupWallProps) {
  const totalShares = members.reduce((sum, m) => sum + m.shares.length, 0);

  if (totalShares === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-24 px-6">
        <p className="text-5xl mb-4">🎧</p>
        <h2 className="font-display text-2xl mb-2">Aucun partage pour l&apos;instant</h2>
        <p className="text-muted max-w-sm">
          Le mur est vide. Ajoute ta première chanson, ton premier album ou ton premier artiste du moment.
        </p>
      </div>
    );
  }

  if (sortMode === "date") {
    const allShares = members.flatMap((m) => m.shares.map((s) => ({ share: s, member: m })));
    allShares.sort((a, b) => new Date(b.share.added_at).getTime() - new Date(a.share.added_at).getTime());

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 p-4 sm:p-6">
        {allShares.map(({ share, member }) => (
          <ShareCard
            key={share.id}
            share={share}
            member={member}
            settings={settings}
            isMe={member.id === viewerMemberId}
            token={token}
            showOwnerAvatar
            showDate
            onOpenDetail={() => onSelectShare(share.id)}
            onRated={onRated}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto p-4 sm:p-6">
      {members.map((member) => (
        <MemberColumn
          key={member.id}
          member={member}
          settings={settings}
          isMe={member.id === viewerMemberId}
          token={token}
          onOpenDetail={onSelectShare}
          onRated={onRated}
          onReorder={onReorder}
          onAddEmpty={onAddShare}
        />
      ))}
    </div>
  );
}
