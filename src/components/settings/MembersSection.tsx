"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
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

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-xl">Membres ({members.length})</h2>
      <ul className="flex flex-col gap-2">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 bg-surface-2 rounded-xl p-3">
            <Avatar emoji={m.avatar_emoji} color={m.avatar_color} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {m.pseudo}
                {m.id === meMemberId && <span className="text-muted"> (toi)</span>}
              </p>
              {m.is_admin && <span className="text-xs text-accent">Admin</span>}
            </div>

            {m.id !== meMemberId && (
              <>
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
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
