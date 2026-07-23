"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { apiFetch, ApiError } from "@/lib/apiClient";

interface EmailFormProps {
  token: string;
  currentEmail: string | null;
  emailVerified: boolean;
  onSaved: () => void;
}

export function EmailForm({ token, currentEmail, emailVerified, onSaved }: EmailFormProps) {
  const { showError, showSuccess } = useToast();
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(currentEmail ?? "");
  const [saving, setSaving] = useState(false);

  async function submitEmail(value: string | null) {
    setSaving(true);
    try {
      const res = await apiFetch<{ ok: true; verificationSent: boolean }>("/api/account/email", {
        method: "POST",
        token,
        body: { email: value },
      });
      showSuccess(
        !value ? "Courriel retiré." : res.verificationSent ? "Courriel de vérification envoyé." : "Courriel enregistré."
      );
      setEditing(false);
      onSaved();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible d'enregistrer ton courriel.");
    } finally {
      setSaving(false);
    }
  }

  function handleSave() {
    const trimmed = email.trim();
    return submitEmail(trimmed || null);
  }

  function handleRemove() {
    return submitEmail(null);
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-1">
        {!currentEmail && (
          <p className="text-xs text-muted">
            Ajoute un courriel (optionnel) pour recevoir le résumé hebdo de ton groupe.
          </p>
        )}
        {currentEmail && !emailVerified && (
          <p className="text-xs text-accent-2">Courriel en attente de vérification — regarde ta boîte de réception.</p>
        )}
        {currentEmail && emailVerified && <p className="text-xs text-muted">Courriel vérifié ✓</p>}
        <button
          type="button"
          onClick={() => {
            setEmail(currentEmail ?? "");
            setEditing(true);
          }}
          className="text-xs text-muted hover:text-accent transition cursor-pointer text-left w-fit"
        >
          {currentEmail ? (emailVerified ? "Changer mon courriel" : "Modifier / renvoyer") : "Ajouter un courriel"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 bg-surface-2 rounded-xl p-3">
      <Input
        autoFocus
        type="email"
        placeholder="toi@exemple.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        className="py-1.5 text-sm"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "..." : "Enregistrer"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
          Annuler
        </Button>
        {currentEmail && (
          <Button variant="ghost" size="sm" onClick={handleRemove} disabled={saving}>
            Retirer
          </Button>
        )}
      </div>
    </div>
  );
}
