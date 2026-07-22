"use client";

import { ShareTile } from "@/components/group/ShareTile";
import type { GroupSettings, MemberWithShares, SortMode } from "@/types";

interface GroupWallProps {
  members: MemberWithShares[];
  settings: GroupSettings;
  sortMode: SortMode;
  onSelectShare: (shareId: string) => void;
}

export function GroupWall({ members, settings, sortMode, onSelectShare }: GroupWallProps) {
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
          <ShareTile
            key={share.id}
            share={share}
            member={member}
            settings={settings}
            onClick={() => onSelectShare(share.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6">
      {members
        .filter((m) => m.shares.length > 0)
        .map((member) => (
          <section key={member.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-muted">
              <span>{member.avatar_emoji}</span>
              <span className="font-medium text-foreground">{member.pseudo}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {member.shares.map((share) => (
                <ShareTile
                  key={share.id}
                  share={share}
                  member={member}
                  settings={settings}
                  onClick={() => onSelectShare(share.id)}
                />
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}
