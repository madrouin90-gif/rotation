"use client";

import type { ReactionSummary } from "@/types";

interface ReactionBarProps {
  emojis: string[];
  reactions: ReactionSummary[];
  onToggle: (emoji: string) => void;
  disabled?: boolean;
}

export function ReactionBar({ emojis, reactions, onToggle, disabled }: ReactionBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {emojis.map((emoji) => {
        const summary = reactions.find((r) => r.emoji === emoji);
        const count = summary?.count ?? 0;
        const reacted = summary?.reactedByMe ?? false;

        return (
          <button
            key={emoji}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(emoji)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition cursor-pointer disabled:opacity-40 ${
              reacted
                ? "bg-accent/20 border-accent text-foreground"
                : "bg-surface-2 border-border text-muted hover:text-foreground"
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="tabular-nums text-xs">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
