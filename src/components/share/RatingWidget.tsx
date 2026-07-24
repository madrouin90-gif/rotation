"use client";

import { useState } from "react";
import { Stepper } from "@/components/ui/Stepper";
import { Button } from "@/components/ui/Button";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { useToast } from "@/components/ui/Toast";

interface RatingWidgetProps {
  itemId: string;
  token: string;
  myScore: number | null;
  onRated: () => void;
}

export function RatingWidget({ itemId, token, myScore, onRated }: RatingWidgetProps) {
  const { showError } = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(myScore ?? 5);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch("/api/ratings", { method: "POST", token, body: { itemId, score: value } });
      setEditing(false);
      onRated();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible d'enregistrer ta note.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        data-no-pan="true"
        onClick={(e) => {
          e.stopPropagation();
          setValue(myScore ?? 5);
          setEditing(true);
        }}
        title={myScore !== null ? "Modifier ta note" : "Noter ce partage"}
        className={`text-xs transition cursor-pointer text-left px-2.5 py-1 rounded-full border ${
          myScore !== null
            ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
            : "border-border bg-surface-2 text-muted hover:text-accent hover:border-accent/40"
        }`}
      >
        {myScore !== null ? `✏️ Ta note : ${myScore}/10` : "+ Noter"}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 min-w-0" data-no-pan="true" onClick={(e) => e.stopPropagation()}>
      <Stepper value={value} min={0} max={10} onChange={setValue} disabled={saving} size="sm" />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? "..." : "Valider"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
