"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { apiFetch, ApiError } from "@/lib/apiClient";

interface PasswordFormProps {
  token: string;
  hasPassword: boolean;
  onSaved: () => void;
}

export function PasswordForm({ token, hasPassword, onSaved }: PasswordFormProps) {
  const { showError, showSuccess } = useToast();
  const [editing, setEditing] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (password !== confirm) {
      showError("Les mots de passe ne correspondent pas.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/account/password", { method: "POST", token, body: { password } });
      showSuccess(hasPassword ? "Mot de passe mis à jour." : "Mot de passe défini.");
      setEditing(false);
      setPassword("");
      setConfirm("");
      onSaved();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible d'enregistrer ton mot de passe.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-1">
        {!hasPassword && (
          <p className="text-xs text-accent-2">
            Tu n&apos;as pas encore de mot de passe — sans ça, tu ne pourras pas te reconnecter depuis un autre
            appareil (ou après une déconnexion).
          </p>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-muted hover:text-accent transition cursor-pointer text-left w-fit"
        >
          {hasPassword ? "Changer mon mot de passe" : "Définir un mot de passe"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 bg-surface-2 rounded-xl p-3">
      <Input
        autoFocus
        type="password"
        placeholder="Nouveau mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="py-1.5 text-sm"
      />
      <Input
        type="password"
        placeholder="Confirme le mot de passe"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="py-1.5 text-sm"
      />
      <p className="text-xs text-muted">8 caractères minimum.</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving || password.length < 8}>
          {saving ? "..." : "Enregistrer"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditing(false);
            setPassword("");
            setConfirm("");
          }}
          disabled={saving}
        >
          Annuler
        </Button>
      </div>
    </div>
  );
}
