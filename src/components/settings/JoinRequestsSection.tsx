"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { formatDateFr } from "@/lib/dates";
import type { PendingRequest } from "@/types";

interface JoinRequestsSectionProps {
  token: string;
  groupCode: string;
  onRefresh: () => void;
}

export function JoinRequestsSection({ token, groupCode, onRefresh }: JoinRequestsSectionProps) {
  const { showError, showSuccess } = useToast();
  const [requests, setRequests] = useState<PendingRequest[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const res = await apiFetch<{ requests: PendingRequest[] }>(`/api/groups/${groupCode}/join-requests`, { token });
      setRequests(res.requests);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible de charger les demandes en attente.");
    }
  }

  useEffect(() => {
    // Récupération d'un système externe (l'API) au montage / changement de groupe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupCode]);

  async function handleDecision(memberId: string, action: "approve" | "reject") {
    setBusyId(memberId);
    try {
      await apiFetch(`/api/groups/${groupCode}/members/${memberId}`, { method: "PATCH", token, body: { action } });
      showSuccess(action === "approve" ? "Membre approuvé." : "Demande rejetée.");
      await load();
      onRefresh();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible de traiter cette demande.");
    } finally {
      setBusyId(null);
    }
  }

  if (requests === null || requests.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-xl">
        Demandes en attente <span className="text-accent">({requests.length})</span>
      </h2>
      <ul className="flex flex-col gap-2">
        {requests.map((r) => (
          <li key={r.id} className="flex items-center gap-3 bg-surface-2 rounded-xl p-3">
            <Avatar emoji={r.avatarEmoji} color={r.avatarColor} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{r.pseudo}</p>
              <p className="text-xs text-muted">Demandé le {formatDateFr(r.createdAt)}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => handleDecision(r.id, "reject")} disabled={busyId === r.id}>
                Rejeter
              </Button>
              <Button size="sm" onClick={() => handleDecision(r.id, "approve")} disabled={busyId === r.id}>
                {busyId === r.id ? "..." : "Approuver"}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
