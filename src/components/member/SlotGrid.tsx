"use client";

import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { SlotCard } from "@/components/member/SlotCard";
import type { GroupSettings, ShareWithReactions } from "@/types";

interface SlotGridProps {
  shares: ShareWithReactions[];
  slotsPerMember: number;
  settings: GroupSettings;
  isMe: boolean;
  onReorder: (orderedShareIds: string[]) => void;
  onOpenDetail: (shareId: string) => void;
  onRemove: (shareId: string) => void;
  onSaveNote: (shareId: string, note: string) => Promise<void>;
  onReplace: (rank: number) => void;
  onAddEmpty: () => void;
}

function SortableSlotItem({
  share,
  rank,
  settings,
  onOpenDetail,
  onRemove,
  onSaveNote,
  onReplace,
}: {
  share: ShareWithReactions;
  rank: number;
  settings: GroupSettings;
  onOpenDetail: () => void;
  onRemove: () => void;
  onSaveNote: (note: string) => Promise<void>;
  onReplace: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: share.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <SlotCard
        rank={rank}
        share={share}
        settings={settings}
        isMe
        dragHandleAttributes={attributes}
        dragHandleListeners={listeners}
        onOpenDetail={onOpenDetail}
        onRemove={onRemove}
        onSaveNote={onSaveNote}
        onReplace={onReplace}
      />
    </div>
  );
}

export function SlotGrid({
  shares,
  slotsPerMember,
  settings,
  isMe,
  onReorder,
  onOpenDetail,
  onRemove,
  onSaveNote,
  onReplace,
  onAddEmpty,
}: SlotGridProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 6 } }));

  // Resynchronise l'ordre local avec le serveur quand le set de partages change (ajout/retrait/refresh),
  // tout en gardant l'ordre optimiste choisi par un drag en cours. Ajustement pendant le rendu plutôt
  // qu'un effect, suivant https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const shareIdsKey = shares.map((s) => s.id).join(",");
  const [synced, setSynced] = useState(() => ({ key: shareIdsKey, ids: shares.map((s) => s.id) }));
  if (synced.key !== shareIdsKey) {
    setSynced({ key: shareIdsKey, ids: shares.map((s) => s.id) });
  }
  const orderedIds = synced.ids;
  const setOrderedIds = (ids: string[]) => setSynced({ key: ids.join(","), ids });

  const byId = new Map(shares.map((s) => [s.id, s]));
  const currentOrder = orderedIds.filter((id) => byId.has(id));
  const missing = shares.filter((s) => !currentOrder.includes(s.id)).map((s) => s.id);
  const finalOrder = [...currentOrder, ...missing];

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = finalOrder.indexOf(String(active.id));
    const newIndex = finalOrder.indexOf(String(over.id));
    const next = arrayMove(finalOrder, oldIndex, newIndex);
    setOrderedIds(next);
    onReorder(next);
  }

  const gridCells: React.ReactNode[] = finalOrder.map((id, index) => {
    const share = byId.get(id)!;
    return (
      <SortableSlotItem
        key={id}
        share={share}
        rank={index + 1}
        settings={settings}
        onOpenDetail={() => onOpenDetail(id)}
        onRemove={() => onRemove(id)}
        onSaveNote={(note) => onSaveNote(id, note)}
        onReplace={() => onReplace(index + 1)}
      />
    );
  });

  for (let i = finalOrder.length; i < slotsPerMember; i++) {
    gridCells.push(<SlotCard key={`empty-${i}`} rank={i + 1} settings={settings} isMe={isMe} onAddEmpty={onAddEmpty} />);
  }

  if (!isMe) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {finalOrder.map((id, index) => {
          const share = byId.get(id)!;
          return (
            <SlotCard
              key={id}
              rank={index + 1}
              share={share}
              settings={settings}
              isMe={false}
              onOpenDetail={() => onOpenDetail(id)}
            />
          );
        })}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={finalOrder} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{gridCells}</div>
      </SortableContext>
    </DndContext>
  );
}
