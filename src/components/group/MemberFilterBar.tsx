"use client";

import { Avatar } from "@/components/ui/Avatar";
import type { MemberWithShares } from "@/types";

interface MemberFilterBarProps {
  members: Pick<MemberWithShares, "id" | "pseudo" | "avatar_emoji" | "avatar_color">[];
  selectedIds: string[];
  onToggle: (memberId: string) => void;
  onReset: () => void;
}

export function MemberFilterBar({ members, selectedIds, onToggle, onReset }: MemberFilterBarProps) {
  if (members.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6">
      {members.map((m) => {
        const selected = selectedIds.includes(m.id);
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onToggle(m.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm border transition cursor-pointer ${
              selected ? "bg-accent/20 border-accent text-foreground" : "bg-surface-2 border-border text-muted"
            }`}
          >
            <Avatar emoji={m.avatar_emoji} color={m.avatar_color} size="xs" />
            {m.pseudo}
          </button>
        );
      })}
      {selectedIds.length > 0 && (
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-muted hover:text-foreground transition cursor-pointer"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}
