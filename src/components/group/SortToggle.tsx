"use client";

import type { SortMode } from "@/types";

interface SortToggleProps {
  value: SortMode;
  onChange: (mode: SortMode) => void;
}

export function SortToggle({ value, onChange }: SortToggleProps) {
  return (
    <div className="inline-flex bg-surface-2 rounded-full p-1 text-sm">
      <button
        type="button"
        onClick={() => onChange("member")}
        className={`px-3 py-1.5 rounded-full transition cursor-pointer ${
          value === "member" ? "bg-accent text-white" : "text-muted hover:text-foreground"
        }`}
      >
        Par membre
      </button>
      <button
        type="button"
        onClick={() => onChange("date")}
        className={`px-3 py-1.5 rounded-full transition cursor-pointer ${
          value === "date" ? "bg-accent text-white" : "text-muted hover:text-foreground"
        }`}
      >
        Par date
      </button>
    </div>
  );
}
