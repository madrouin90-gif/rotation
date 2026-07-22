"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { apiFetch, ApiError } from "@/lib/apiClient";

interface IdentitySectionProps {
  token: string;
  groupCode: string;
  groupName: string;
  onRefresh: () => void;
}

export function IdentitySection({ token, groupCode, groupName, onRefresh }: IdentitySectionProps) {
  const { showError, showSuccess } = useToast();
  const [name, setName] = useState(groupName);
  const [savingName, setSavingName] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  async function handleRename() {
    if (!name.trim() || name.trim() === groupName) return;
    setSavingName(true);
    try {
      await apiFetch(`/api/groups/${groupCode}`, {
        method: "PATCH",
        token,
        body: { action: "rename", name: name.trim() },
      });
      showSuccess("Nom du groupe mis à jour.");
      onRefresh();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible de renommer le groupe.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const result = await apiFetch<{ code: string }>(`/api/groups/${groupCode}`, {
        method: "PATCH",
        token,
        body: { action: "regenerate_code" },
      });
      showSuccess(`Nouveau code : ${result.code}`);
      setConfirmRegenerate(false);
      window.location.href = `/g/${result.code}/reglages`;
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible de régénérer le code.");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <h2 className="font-display text-xl">Identité du groupe</h2>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-muted">Nom du groupe</label>
        <div className="flex gap-2">
          <Input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          <Button disabled={!name.trim() || name.trim() === groupName || savingName} onClick={handleRename}>
            {savingName ? "..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-muted">Code du groupe : {groupCode}</label>
        {!confirmRegenerate ? (
          <Button variant="secondary" className="w-fit" onClick={() => setConfirmRegenerate(true)}>
            Régénérer le code
          </Button>
        ) : (
          <div className="flex items-center gap-3 bg-surface-2 rounded-xl p-3">
            <p className="text-sm text-muted flex-1">
              L&apos;ancien code ne fonctionnera plus. Les membres devront utiliser le nouveau code pour rejoindre.
            </p>
            <Button variant="secondary" size="sm" onClick={() => setConfirmRegenerate(false)} disabled={regenerating}>
              Annuler
            </Button>
            <Button variant="danger" size="sm" onClick={handleRegenerate} disabled={regenerating}>
              {regenerating ? "..." : "Confirmer"}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
