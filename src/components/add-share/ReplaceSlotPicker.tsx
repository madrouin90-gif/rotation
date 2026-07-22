"use client";

import type { ShareWithReactions } from "@/types";

interface ReplaceSlotPickerProps {
  shares: ShareWithReactions[];
  onPick: (rank: number) => void;
  disabled?: boolean;
}

export function ReplaceSlotPicker({ shares, onPick, disabled }: ReplaceSlotPickerProps) {
  const sorted = [...shares].sort((a, b) => a.rank - b.rank);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Tes slots sont tous pleins. Choisis lequel remplacer par ce nouveau partage :
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {sorted.map((share) => (
          <button
            key={share.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(share.rank)}
            className="group relative aspect-square rounded-xl overflow-hidden bg-surface-2 disabled:opacity-40 cursor-pointer"
          >
            {share.item.artwork_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={share.item.artwork_url} alt={share.item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">🎵</div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium transition">
                Remplacer
              </span>
            </div>
            <span className="absolute top-1 left-1 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded-full">
              #{share.rank}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
