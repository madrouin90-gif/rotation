"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { apiFetch, ApiError } from "@/lib/apiClient";

interface PseudoFormProps {
  token: string;
  currentPseudo: string;
  onSaved: () => void;
}

export function PseudoForm({ token, currentPseudo, onSaved }: PseudoFormProps) {
  const { showError, showSuccess } = useToast();
  const [editing, setEditing] = useState(false);
  const [pseudo, setPseudo] = useState(currentPseudo);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmed = pseudo.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await apiFetch("/api/account/pseudo", { method: "POST", token, body: { pseudo: trimmed } });
      showSuccess("Pseudo mis à jour.");
      setEditing(false);
      onSaved();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible de renommer ton profil.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setPseudo(currentPseudo);
          setEditing(true);
        }}
        className="text-xs text-muted hover:text-accent transition cursor-pointer text-left w-fit"
      >
        Changer mon pseudo
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 bg-surface-2 rounded-xl p-3">
      <Input
        autoFocus
        value={pseudo}
        maxLength={24}
        onChange={(e) => setPseudo(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        className="py-1.5 text-sm"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving || !pseudo.trim()}>
          {saving ? "..." : "Enregistrer"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
