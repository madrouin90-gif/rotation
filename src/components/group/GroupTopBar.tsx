"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const { showSuccess, showError } = useToast();

  async function handleInvite() {
    const url = `${window.location.origin}/rejoindre?code=${groupCode}`;
    try {
      await navigator.clipboard.writeText(url);
      showSuccess("Lien d'invitation copié !");
    } catch {
      showError("Impossible de copier le lien. Voici le code : " + groupCode);
    }
  }

  function closeMenu() {
    setMenuOpen(false);
    setConfirmingLogout(false);
  }

  const menuLinkClass =
    "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-left transition cursor-pointer hover:bg-surface-2";

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-display text-xl truncate">{groupName}</h1>
          <span className="hidden sm:inline text-xs text-muted bg-surface-2 px-2 py-1 rounded-full">{groupCode}</span>
          <button
            type="button"
            onClick={handleInvite}
            className="hidden sm:flex items-center gap-1 text-xs text-accent hover:underline cursor-pointer shrink-0"
            title="Copier le lien d'invitation"
          >
            🔗 Inviter
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex -space-x-2 mr-1">
            {members.filter((m) => m.is_active && m.isOnline).map((m) => (
              <Link key={m.id} href={`/g/${groupCode}/membre/${m.id}`} title={m.pseudo}>
                <Avatar emoji={m.avatar_emoji} color={m.avatar_color} size="sm" ring />
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

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
              title="Menu"
              className="relative w-9 h-9 rounded-full bg-surface-2 hover:bg-surface-2/70 flex items-center justify-center transition cursor-pointer"
            >
              ☰
              {isAdmin && pendingRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent-2 text-white text-[10px] font-semibold flex items-center justify-center">
                  {pendingRequestsCount}
                </span>
              )}
            </button>

            {menuOpen && (
              <>
                {/* Zone invisible qui capte les clics à l'extérieur pour fermer le menu. */}
                <button
                  type="button"
                  aria-label="Fermer le menu"
                  className="fixed inset-0 z-30 cursor-default"
                  onClick={closeMenu}
                />
                <div className="absolute right-0 top-11 z-40 w-56 bg-surface border border-border rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5 animate-fade-in-up">
                  <Link href={`/g/${groupCode}/chat`} onClick={closeMenu} className={menuLinkClass}>
                    💬 Chat du groupe
                  </Link>
                  <Link href={`/g/${groupCode}/palmares`} onClick={closeMenu} className={menuLinkClass}>
                    🏆 Palmarès
                  </Link>
                  <Link href={`/g/${groupCode}/favoris`} onClick={closeMenu} className={menuLinkClass}>
                    ★ Mes favoris
                  </Link>
                  <Link href="/guide" onClick={closeMenu} className={menuLinkClass}>
                    ❓ Guide d&apos;utilisation
                  </Link>
                  {isAdmin && (
                    <Link href={`/g/${groupCode}/reglages`} onClick={closeMenu} className={`${menuLinkClass} justify-between`}>
                      <span>⚙️ Réglages du groupe</span>
                      {pendingRequestsCount > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-accent-2 text-white text-[10px] font-semibold flex items-center justify-center">
                          {pendingRequestsCount}
                        </span>
                      )}
                    </Link>
                  )}
                  <Link href={`/g/${groupCode}/membre/${meMemberId}`} onClick={closeMenu} className={menuLinkClass}>
                    👤 Mon profil
                  </Link>

                  <hr className="border-border my-1" />

                  {confirmingLogout ? (
                    <div className="flex flex-col gap-2 px-3 py-2 text-xs">
                      <span className="text-muted">
                        {hasPassword ? "Confirmer la déconnexion ?" : "Sans mot de passe, tu perdras l'accès !"}
                      </span>
                      <div className="flex gap-3">
                        <button onClick={onLogout} className="text-red-400 hover:underline cursor-pointer">
                          Confirmer
                        </button>
                        <button
                          onClick={() => setConfirmingLogout(false)}
                          className="text-muted hover:underline cursor-pointer"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingLogout(true)}
                      className={`${menuLinkClass} text-red-400`}
                    >
                      Se déconnecter
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
