"use client";

import { useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { THEME_OPTIONS } from "@/lib/theme";

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="bg-surface border border-border rounded-2xl shadow-2xl p-2 flex flex-col gap-1 animate-fade-in-up min-w-[190px]">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setTheme(option.id);
                setOpen(false);
              }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-left transition cursor-pointer ${
                theme === option.id ? "bg-accent/20 text-foreground" : "hover:bg-surface-2 text-muted"
              }`}
            >
              <span className="flex -space-x-1.5 shrink-0">
                {option.swatch.map((color, i) => (
                  <span
                    key={i}
                    className="w-4 h-4 rounded-full border border-border/60"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
              <span className="flex-1">{option.label}</span>
              {theme === option.id && <span className="text-accent">✓</span>}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Choisir un thème"
        title="Choisir un thème"
        className="w-12 h-12 rounded-full bg-surface-2 border border-border hover:bg-accent hover:text-white flex items-center justify-center text-xl shadow-xl transition cursor-pointer"
      >
        🎨
      </button>
    </div>
  );
}
