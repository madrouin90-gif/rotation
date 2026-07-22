"use client";

import { AVATAR_COLORS, AVATAR_EMOJIS } from "@/lib/avatars";
import { Avatar } from "@/components/ui/Avatar";

interface AvatarPickerProps {
  emoji: string;
  color: string;
  onChange: (emoji: string, color: string) => void;
}

export function AvatarPicker({ emoji, color, onChange }: AvatarPickerProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <Avatar emoji={emoji} color={color} size="lg" />

      <div className="w-full">
        <p className="text-sm text-muted mb-2">Choisis un symbole</p>
        <div className="grid grid-cols-8 gap-2">
          {AVATAR_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onChange(e, color)}
              className={`aspect-square rounded-xl flex items-center justify-center text-lg transition cursor-pointer ${
                e === emoji ? "bg-accent/20 ring-2 ring-accent" : "bg-surface-2 hover:bg-surface-2/70"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full">
        <p className="text-sm text-muted mb-2">Choisis une couleur</p>
        <div className="grid grid-cols-5 gap-2">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(emoji, c)}
              className={`aspect-square rounded-xl transition cursor-pointer ${
                c === color ? "ring-2 ring-offset-2 ring-offset-surface ring-white" : ""
              }`}
              style={{ backgroundColor: c }}
              aria-label={`Couleur ${c}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
