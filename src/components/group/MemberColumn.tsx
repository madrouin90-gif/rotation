"use client";

import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { ShareCard } from "@/components/group/ShareCard";
import type { MemberWithShares, GroupSettings } from "@/types";

interface MemberColumnProps {
  member: MemberWithShares;
  settings: GroupSettings;
  isMe: boolean;
  token: string;
  disableReorder?: boolean;
  /** Nombre de rangs partagé par toutes les colonnes du mur (voir GroupWall) — garantit que
   * cette colonne s'aligne avec les autres même quand le contenu de certaines cartes diffère
   * en hauteur (subgrid : chaque rang occupe la même bande verticale peu importe la colonne). */
  rows: number;
  onOpenDetail: (shareId: string) => void;
  onRated: () => void;
  onReorder: (orderedShareIds: string[]) => void;
  onAddEmpty: () => void;
}

type CardProps = Omit<Parameters<typeof ShareCard>[0], "dragHandleAttributes" | "dragHandleListeners">;

function SortableShareCard({ shareId, ...cardProps }: { shareId: string } & CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: shareId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className="min-w-0">
      <ShareCard {...cardProps} dragHandleAttributes={attributes} dragHandleListeners={listeners} />
    </div>
  );
}

/** Emplacement vide — garantit que les rangs 1..N s'alignent horizontalement entre les colonnes,
 * peu importe combien de partages chaque membre a réellement. */
function EmptySlot({ isMe, onAddEmpty }: { isMe: boolean; onAddEmpty: () => void }) {
  if (!isMe) {
    return <div className="rounded-2xl border border-dashed border-border/40 aspect-square min-w-0" />;
  }
  return (
    <button
      type="button"
      onClick={onAddEmpty}
      data-no-pan="true"
      className="aspect-square rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted hover:border-accent hover:text-accent transition cursor-pointer min-w-0"
    >
      <span className="text-2xl">+</span>
      <span className="text-xs">Ajouter</span>
    </button>
  );
}

export function MemberColumn({
  member,
  settings,
  isMe,
  token,
  disableReorder,
  rows,
  onOpenDetail,
  onRated,
  onReorder,
  onAddEmpty,
}: MemberColumnProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 6 } }));
  // Le réordonnancement envoie l'ensemble complet des IDs de partages du membre au serveur
  // (le RPC reorder_shares rejette tout sous-ensemble) — désactivé pendant qu'un filtre
  // de genre masque certaines cartes, sinon le glisser-déposer échouerait silencieusement.
  const canReorder = isMe && !disableReorder;

  // Ordre local optimiste (feedback instantané pendant le drag), resynchronisé avec le
  // serveur quand le set de partages change — même pattern que SlotGrid.tsx.
  const shareIdsKey = member.shares.map((s) => s.id).join(",");
  const [synced, setSynced] = useState(() => ({ key: shareIdsKey, ids: member.shares.map((s) => s.id) }));
  if (synced.key !== shareIdsKey) {
    setSynced({ key: shareIdsKey, ids: member.shares.map((s) => s.id) });
  }
  const orderedIds = synced.ids;
  const byId = new Map(member.shares.map((s) => [s.id, s]));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedIds.indexOf(String(active.id));
    const newIndex = orderedIds.indexOf(String(over.id));
    const next = arrayMove(orderedIds, oldIndex, newIndex);
    setSynced({ key: next.join(","), ids: next });
    onReorder(next);
  }

  const rowIndexes = Array.from({ length: rows }, (_, i) => i);

  const cards = rowIndexes.map((index) => {
    const id = orderedIds[index];
    if (!id) {
      return <EmptySlot key={`empty-${index}`} isMe={isMe} onAddEmpty={onAddEmpty} />;
    }
    const share = byId.get(id);
    if (!share) return null;
    const cardProps: CardProps = {
      share: { ...share, rank: index + 1 },
      member,
      settings,
      isMe,
      token,
      showOwnerAvatar: false,
      onOpenDetail: () => onOpenDetail(id),
      onRated,
    };
    return canReorder ? (
      <SortableShareCard key={id} shareId={id} {...cardProps} />
    ) : (
      <ShareCard key={id} {...cardProps} />
    );
  });

  return (
    // min-w-0 est essentiel : sans lui, un item de grille garde par défaut une largeur
    // minimale basée sur le contenu (min-width: auto) — ici la pochette d'album (<img>),
    // qui a une taille intrinsèque propre. Sans ce reset, la colonne refuse de rétrécir à
    // la largeur de piste voulue (auto-cols-*) et déborde sur la colonne suivante.
    <div className="grid min-w-0 items-start" style={{ gridRow: "1 / -1", gridTemplateRows: "subgrid" }}>
      <div className="flex items-center gap-2 px-1 min-w-0">
        <Avatar emoji={member.avatar_emoji} color={member.avatar_color} size="sm" />
        <span className="font-medium text-sm truncate">{member.pseudo}</span>
      </div>

      {canReorder ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
            {cards}
          </SortableContext>
        </DndContext>
      ) : (
        cards
      )}
    </div>
  );
}
