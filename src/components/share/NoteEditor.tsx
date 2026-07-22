"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface NoteEditorProps {
  initialNote: string;
  maxLength: number;
  onSave: (note: string) => Promise<void> | void;
  onCancel: () => void;
}

export function NoteEditor({ initialNote, maxLength, onSave, onCancel }: NoteEditorProps) {
  const [note, setNote] = useState(initialNote);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(note);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
      <textarea
        autoFocus
        value={note}
        maxLength={maxLength}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent transition resize-none"
        placeholder="Un mot sur ce partage..."
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">
          {note.length}/{maxLength}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
            Annuler
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "..." : "Enregistrer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
