"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface GenreEditorProps {
  initialGenres: string[];
  availableGenres: string[];
  onSave: (genres: string[]) => Promise<void> | void;
  onCancel: () => void;
}

export function GenreEditor({ initialGenres, availableGenres, onSave, onCancel }: GenreEditorProps) {
  const [genres, setGenres] = useState<string[]>(initialGenres);
  const [saving, setSaving] = useState(false);

  function toggleGenre(genre: string) {
    setGenres((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(genres);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap gap-1.5">
        {availableGenres.map((genre) => {
          const selected = genres.includes(genre);
          return (
            <button
              key={genre}
              type="button"
              onClick={() => toggleGenre(genre)}
              className={`px-2 py-1 rounded-full text-xs border transition cursor-pointer ${
                selected ? "bg-accent/20 border-accent text-foreground" : "bg-surface-2 border-border text-muted"
              }`}
            >
              {genre}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          Annuler
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "..." : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
