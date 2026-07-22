"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import type { MemberWithShares } from "@/types";

interface GroupTopBarProps {
  groupName: string;
  groupCode: string;
  members: MemberWithShares[];
  meMemberId: string;
  isAdmin: boolean;
  onAddShare: () => void;
}

export function GroupTopBar({ groupName, groupCode, members, meMemberId, isAdmin, onAddShare }: GroupTopBarProps) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-display text-xl truncate">{groupName}</h1>
          <span className="hidden sm:inline text-xs text-muted bg-surface-2 px-2 py-1 rounded-full">{groupCode}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex -space-x-2 mr-1">
            {members.map((m) => (
              <Link key={m.id} href={`/g/${groupCode}/membre/${m.id}`} title={m.pseudo}>
                <Avatar
                  emoji={m.avatar_emoji}
                  color={m.avatar_color}
                  size="sm"
                  ring
                />
              </Link>
            ))}
          </div>

          <Button size="sm" onClick={onAddShare}>
            + Partager
          </Button>

          <Link
            href={`/g/${groupCode}/historique`}
            className="w-9 h-9 rounded-full bg-surface-2 hover:bg-surface-2/70 flex items-center justify-center transition cursor-pointer"
            title="Historique"
          >
            🕒
          </Link>

          <Link
            href={`/g/${groupCode}/palmares`}
            className="w-9 h-9 rounded-full bg-surface-2 hover:bg-surface-2/70 flex items-center justify-center transition cursor-pointer"
            title="Palmarès"
          >
            🏆
          </Link>

          {isAdmin && (
            <Link
              href={`/g/${groupCode}/reglages`}
              className="w-9 h-9 rounded-full bg-surface-2 hover:bg-surface-2/70 flex items-center justify-center transition cursor-pointer"
              title="Réglages du groupe"
            >
              ⚙️
            </Link>
          )}

          <Link
            href={`/g/${groupCode}/membre/${meMemberId}`}
            className="text-xs text-muted hover:text-foreground transition hidden sm:block"
          >
            Mon profil
          </Link>
        </div>
      </div>
    </header>
  );
}
