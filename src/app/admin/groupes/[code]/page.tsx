"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { apiFetch, ApiError } from "@/lib/apiClient";

interface AdminMember {
  id: string;
  pseudo: string;
  avatar_emoji: string;
  avatar_color: string;
  is_admin: boolean;
  is_owner: boolean;
  is_active: boolean;
  approval_status: "pending" | "approved";
  created_at: string;
}

interface AdminGroupDetail {
  group: { id: string; name: string; code: string; createdAt: string };
  members: AdminMember[];
}

export default function AdminGroupDetailPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [data, setData] = useState<AdminGroupDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    apiFetch("/api/admin/session")
      .then(() => setAuthChecked(true))
      .catch(() => router.replace("/admin/login"));
  }, [router]);

  async function load() {
    try {
      const res = await apiFetch<AdminGroupDetail>(`/api/admin/groups/${code}`);
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de charger ce groupe.");
    }
  }

  useEffect(() => {
    // Récupération d'un système externe (l'API) au changement de statut d'authentification ou de groupe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (authChecked) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, code]);

  async function handleToggleActive(memberId: string, nextActive: boolean) {
    setBusyId(memberId);
    try {
      await apiFetch(`/api/admin/groups/${code}/members/${memberId}`, {
        method: "PATCH",
        body: { action: "toggle_active", isActive: nextActive },
      });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de mettre à jour ce membre.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(memberId: string) {
    setBusyId(memberId);
    try {
      await apiFetch(`/api/admin/groups/${code}/members/${memberId}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de retirer ce membre.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRegenerateCode() {
    try {
      const res = await apiFetch<{ code: string }>(`/api/admin/groups/${code}`, {
        method: "PATCH",
        body: { action: "regenerate_code" },
      });
      router.push(`/admin/groupes/${res.code}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de régénérer le code.");
    }
  }

  async function handleDeleteGroup() {
    try {
      await apiFetch(`/api/admin/groups/${code}`, { method: "DELETE" });
      router.push("/admin");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de supprimer ce groupe.");
    }
  }

  if (!authChecked) return null;

  return (
    <main className="flex-1 flex flex-col p-4 sm:p-6 max-w-3xl w-full mx-auto gap-6">
      <Link href="/admin" className="text-sm text-muted hover:text-foreground transition">
        ← Tous les groupes
      </Link>

      {error && <p className="text-red-400">{error}</p>}

      {data && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl">{data.group.name}</h1>
              <p className="text-xs text-muted">{data.group.code}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleRegenerateCode}>
                Régénérer le code
              </Button>
              {confirmDelete ? (
                <>
                  <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
                    Annuler
                  </Button>
                  <Button variant="danger" size="sm" onClick={handleDeleteGroup}>
                    Confirmer la suppression
                  </Button>
                </>
              ) : (
                <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                  Supprimer le groupe
                </Button>
              )}
            </div>
          </div>

          <ul className="flex flex-col gap-2">
            {data.members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 bg-surface-2 rounded-xl p-3">
                <Avatar emoji={m.avatar_emoji} color={m.avatar_color} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{m.pseudo}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {m.is_owner && <span className="text-xs text-accent">Créateur</span>}
                    {m.is_admin && !m.is_owner && <span className="text-xs text-accent">Admin</span>}
                    {m.approval_status === "pending" && (
                      <span className="text-xs bg-surface px-1.5 py-0.5 rounded-full text-muted">En attente</span>
                    )}
                    {!m.is_active && (
                      <span className="text-xs bg-surface px-1.5 py-0.5 rounded-full text-muted">Désactivé</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(m.id, !m.is_active)}
                    disabled={busyId === m.id}
                  >
                    {m.is_active ? "Désactiver" : "Réactiver"}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleRemove(m.id)} disabled={busyId === m.id}>
                    Retirer
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
