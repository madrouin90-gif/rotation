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
    <div ref={setNodeRef} style={style}>
      <ShareCard {...cardProps} dragHandleAttributes={attributes} dragHandleListeners={listeners} />
    </div>
  );
}

export function MemberColumn({
  member,
  settings,
  isMe,
  token,
  onOpenDetail,
  onRated,
  onReorder,
  onAddEmpty,
}: MemberColumnProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 6 } }));

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

  const cards = orderedIds
    .map((id, index) => {
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
      return isMe ? <SortableShareCard key={id} shareId={id} {...cardProps} /> : <ShareCard key={id} {...cardProps} />;
    })
    .filter(Boolean);

  return (
    <div className="shrink-0 w-40 sm:w-48 flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <Avatar emoji={member.avatar_emoji} color={member.avatar_color} size="sm" />
        <span className="font-medium text-sm truncate">{member.pseudo}</span>
      </div>

      {member.shares.length === 0 && <p className="text-xs text-muted px-1">Rien pour l&apos;instant.</p>}

      {isMe ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">{cards}</div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="flex flex-col gap-3">{cards}</div>
      )}

      {isMe && (
        <button
          type="button"
          onClick={onAddEmpty}
          className="rounded-2xl border-2 border-dashed border-border text-muted hover:border-accent hover:text-accent transition cursor-pointer py-3 text-sm"
        >
          + Ajouter
        </button>
      )}
    </div>
  );
}
