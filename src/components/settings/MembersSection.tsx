"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type { MemberWithShares } from "@/types";

interface MembersSectionProps {
  token: string;
  groupCode: string;
  members: MemberWithShares[];
  meMemberId: string;
  onRefresh: () => void;
}

export function MembersSection({ token, groupCode, members, meMemberId, onRefresh }: MembersSectionProps) {
  const { showError, showSuccess } = useToast();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renamingBusy, setRenamingBusy] = useState(false);

  async function handleRemove(memberId: string) {
    setRemovingId(memberId);
    try {
      await apiFetch(`/api/groups/${groupCode}/members/${memberId}`, { method: "DELETE", token });
      showSuccess("Membre retiré du groupe.");
      setConfirmingId(null);
      onRefresh();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible de retirer ce membre.");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleToggleActive(memberId: string, nextActive: boolean) {
    setTogglingId(memberId);
    try {
      await apiFetch(`/api/groups/${groupCode}/members/${memberId}`, {
        method: "PATCH",
        token,
        body: { action: "toggle_active", isActive: nextActive },
      });
      showSuccess(nextActive ? "Membre réactivé." : "Membre désactivé.");
      onRefresh();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible de mettre à jour ce membre.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleRename(memberId: string) {
    const pseudo = renameValue.trim();
    if (!pseudo) return;
    setRenamingBusy(true);
    try {
      await apiFetch(`/api/groups/${groupCode}/members/${memberId}`, {
        method: "PATCH",
        token,
        body: { action: "rename", pseudo },
      });
      showSuccess("Pseudo mis à jour.");
      setRenamingId(null);
      onRefresh();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible de renommer ce membre.");
    } finally {
      setRenamingBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-xl">Membres ({members.length})</h2>
      <ul className="flex flex-col gap-2">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 bg-surface-2 rounded-xl p-3">
            <Avatar emoji={m.avatar_emoji} color={m.avatar_color} size="sm" />
            <div className="flex-1 min-w-0">
              {renamingId === m.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    autoFocus
                    value={renameValue}
                    maxLength={24}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRename(m.id)}
                    className="py-1.5 text-sm"
                  />
                  <Button size="sm" onClick={() => handleRename(m.id)} disabled={renamingBusy || !renameValue.trim()}>
                    {renamingBusy ? "..." : "Enregistrer"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setRenamingId(null)} disabled={renamingBusy}>
                    Annuler
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setRenamingId(m.id);
                    setRenameValue(m.pseudo);
                  }}
                  className="font-medium truncate hover:text-accent transition cursor-pointer text-left"
                  title="Renommer"
                >
                  {m.pseudo}
                  {m.id === meMemberId && <span className="text-muted"> (toi)</span>}
                </button>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                {m.is_admin && <span className="text-xs text-accent">Admin</span>}
                {!m.is_active && <span className="text-xs bg-surface px-1.5 py-0.5 rounded-full text-muted">Désactivé</span>}
              </div>
            </div>

            {m.id !== meMemberId && renamingId !== m.id && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleActive(m.id, !m.is_active)}
                  disabled={togglingId === m.id}
                >
                  {togglingId === m.id ? "..." : m.is_active ? "Désactiver" : "Réactiver"}
                </Button>

                {confirmingId === m.id ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setConfirmingId(null)}
                      disabled={removingId === m.id}
                    >
                      Annuler
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleRemove(m.id)} disabled={removingId === m.id}>
                      {removingId === m.id ? "..." : "Confirmer"}
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setConfirmingId(m.id)}>
                    Retirer
                  </Button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
