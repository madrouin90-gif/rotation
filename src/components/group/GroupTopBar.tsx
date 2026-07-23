"use client";

import { useState } from "react";
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
  hasPassword: boolean;
  pendingRequestsCount: number;
  onAddShare: () => void;
  onLogout: () => void;
}

export function GroupTopBar({
  groupName,
  groupCode,
  members,
  meMemberId,
  isAdmin,
  hasPassword,
  pendingRequestsCount,
  onAddShare,
  onLogout,
}: GroupTopBarProps) {
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-display text-xl truncate">{groupName}</h1>
          <span className="hidden sm:inline text-xs text-muted bg-surface-2 px-2 py-1 rounded-full">{groupCode}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex -space-x-2 mr-1">
            {members.filter((m) => m.is_active).map((m) => (
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
            className="h-9 rounded-full bg-accent/20 border border-accent/40 hover:bg-accent/30 flex items-center gap-1.5 px-3 transition cursor-pointer text-accent text-sm font-medium"
            title="Historique"
          >
            <span>🕒</span>
            <span className="hidden sm:inline">Historique</span>
          </Link>

          <Link
            href={`/g/${groupCode}/palmares`}
            className="w-9 h-9 rounded-full bg-surface-2 hover:bg-surface-2/70 flex items-center justify-center transition cursor-pointer"
            title="Palmarès"
          >
            🏆
          </Link>

          <Link
            href={`/g/${groupCode}/favoris`}
            className="w-9 h-9 rounded-full bg-surface-2 hover:bg-surface-2/70 flex items-center justify-center transition cursor-pointer"
            title="Mes favoris"
          >
            ★
          </Link>

          <Link
            href="/guide"
            className="hidden sm:flex w-9 h-9 rounded-full bg-surface-2 hover:bg-surface-2/70 items-center justify-center transition cursor-pointer"
            title="Guide d'utilisation"
          >
            ❓
          </Link>

          {isAdmin && (
            <Link
              href={`/g/${groupCode}/reglages`}
              className="relative w-9 h-9 rounded-full bg-surface-2 hover:bg-surface-2/70 flex items-center justify-center transition cursor-pointer"
              title="Réglages du groupe"
            >
              ⚙️
              {pendingRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent-2 text-white text-[10px] font-semibold flex items-center justify-center">
                  {pendingRequestsCount}
                </span>
              )}
            </Link>
          )}

          <Link
            href={`/g/${groupCode}/membre/${meMemberId}`}
            className="text-xs text-muted hover:text-foreground transition hidden sm:block"
          >
            Mon profil
          </Link>

          {confirmingLogout ? (
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="text-muted max-w-[10rem]">
                {hasPassword ? "Confirmer ?" : "Sans mot de passe, tu perdras l'accès !"}
              </span>
              <button onClick={onLogout} className="text-red-400 hover:underline cursor-pointer">
                Confirmer
              </button>
              <button onClick={() => setConfirmingLogout(false)} className="text-muted hover:underline cursor-pointer">
                Annuler
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingLogout(true)}
              className="text-xs text-muted hover:text-foreground transition hidden sm:block cursor-pointer"
            >
              Se déconnecter
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
