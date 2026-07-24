"use client";

import { useEffect, useRef } from "react";
import { MemberColumn } from "@/components/group/MemberColumn";
import { ShareListRow } from "@/components/group/ShareListRow";
import { dateGroupKey, formatDateGroupLabel } from "@/lib/dates";
import type { GroupSettings, MemberWithShares, ShareWithReactions, SortMode } from "@/types";

const PAN_CLICK_THRESHOLD_PX = 5;

interface GroupWallProps {
  members: MemberWithShares[];
  settings: GroupSettings;
  sortMode: SortMode;
  viewerMemberId: string;
  token: string;
  disableReorder?: boolean;
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
  disableReorder,
  onSelectShare,
  onReorder,
  onRated,
  onAddShare,
}: GroupWallProps) {
  const activeMembers = members.filter((m) => m.is_active);
  const totalShares = activeMembers.reduce((sum, m) => sum + m.shares.length, 0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panState = useRef({ down: false, moved: false, startX: 0, startScrollLeft: 0 });

  function scrollByColumn(direction: 1 | -1) {
    scrollRef.current?.scrollBy({ left: direction * 260, behavior: "smooth" });
  }

  // Glisser-déposer à la souris pour défiler horizontalement entre les colonnes de membres.
  // Ignore les zones marquées data-drag-handle (cartes triables de dnd-kit sur sa propre
  // colonne) et data-no-pan (contrôles qui doivent toujours réagir au clic sans interférence,
  // ex. bouton d'écoute, widget de note). Distingue clic vs glissement via un seuil de
  // mouvement, en supprimant le clic qui suivrait un vrai glissement.
  function handlePanMouseDownCapture(e: React.MouseEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-drag-handle], [data-no-pan]")) return;
    const container = scrollRef.current;
    if (!container) return;
    panState.current = { down: true, moved: false, startX: e.clientX, startScrollLeft: container.scrollLeft };
  }

  function handlePanClickCapture(e: React.MouseEvent<HTMLDivElement>) {
    if (panState.current.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const state = panState.current;
      if (!state.down || !scrollRef.current) return;
      const dx = e.clientX - state.startX;
      if (Math.abs(dx) > PAN_CLICK_THRESHOLD_PX) state.moved = true;
      if (state.moved) scrollRef.current.scrollLeft = state.startScrollLeft - dx;
    }
    function onMouseUp() {
      panState.current.down = false;
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

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
    const allShares = activeMembers.flatMap((m) => m.shares.map((s) => ({ share: s, member: m })));
    allShares.sort((a, b) => new Date(b.share.added_at).getTime() - new Date(a.share.added_at).getTime());

    // Regroupe les partages consécutifs (déjà triés du plus récent au plus ancien) par jour
    // civil, pour une liste clairement délimitée par date plutôt qu'une grille continue.
    const dateGroups: { key: string; label: string; items: { share: ShareWithReactions; member: MemberWithShares }[] }[] =
      [];
    for (const entry of allShares) {
      const key = dateGroupKey(entry.share.added_at);
      const last = dateGroups[dateGroups.length - 1];
      if (last && last.key === key) {
        last.items.push(entry);
      } else {
        dateGroups.push({ key, label: formatDateGroupLabel(entry.share.added_at), items: [entry] });
      }
    }

    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        {dateGroups.map((group) => (
          <div key={group.key} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted px-1">{group.label}</h3>
            <div className="flex flex-col divide-y divide-border/60 bg-surface-2/40 rounded-2xl overflow-hidden">
              {group.items.map(({ share, member }) => (
                <ShareListRow
                  key={share.id}
                  share={share}
                  member={member}
                  token={token}
                  onOpenDetail={() => onSelectShare(share.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative group/wall">
      <button
        type="button"
        onClick={() => scrollByColumn(-1)}
        aria-label="Défiler vers la gauche"
        className="hidden sm:flex absolute left-1 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-surface-2/90 hover:bg-accent border border-border items-center justify-center text-foreground shadow-lg backdrop-blur-sm transition cursor-pointer"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={() => scrollByColumn(1)}
        aria-label="Défiler vers la droite"
        className="hidden sm:flex absolute right-1 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-surface-2/90 hover:bg-accent border border-border items-center justify-center text-foreground shadow-lg backdrop-blur-sm transition cursor-pointer"
      >
        ›
      </button>

      <div
        ref={scrollRef}
        onMouseDownCapture={handlePanMouseDownCapture}
        onClickCapture={handlePanClickCapture}
        className="wall-scroll flex gap-4 overflow-x-auto p-4 sm:p-6 scroll-smooth cursor-grab active:cursor-grabbing"
      >
        {activeMembers.map((member) => (
          <MemberColumn
            key={member.id}
            member={member}
            settings={settings}
            isMe={member.id === viewerMemberId}
            token={token}
            disableReorder={disableReorder}
            onOpenDetail={onSelectShare}
            onRated={onRated}
            onReorder={onReorder}
            onAddEmpty={onAddShare}
          />
        ))}
      </div>
    </div>
  );
}
