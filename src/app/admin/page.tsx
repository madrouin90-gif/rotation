"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { formatDateFr } from "@/lib/dates";
import { formatAuditEntry } from "@/lib/auditLabels";

interface AdminGroupSummary {
  id: string;
  name: string;
  code: string;
  isPublic: boolean;
  memberCount: number;
  pendingCount: number;
  createdAt: string;
}

interface AuditEntry {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  memberPseudo: string | null;
  groupName: string | null;
  groupCode: string | null;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [groups, setGroups] = useState<AdminGroupSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[] | null>(null);

  useEffect(() => {
    apiFetch<{ email: string }>("/api/admin/session")
      .then((res) => setEmail(res.email))
      .catch(() => router.replace("/admin/login"));
  }, [router]);

  useEffect(() => {
    if (!email) return;
    apiFetch<{ groups: AdminGroupSummary[] }>("/api/admin/groups")
      .then((res) => setGroups(res.groups))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger les groupes."));
  }, [email]);

  useEffect(() => {
    if (!email) return;
    apiFetch<{ entries: AuditEntry[] }>("/api/admin/audit-log?limit=50")
      .then((res) => setAuditEntries(res.entries))
      .catch(() => {});
  }, [email]);

  async function handleLogout() {
    await apiFetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  if (!email) return null;

  return (
    <main className="flex-1 flex flex-col p-4 sm:p-6 max-w-4xl w-full mx-auto gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Super-admin</h1>
          <p className="text-sm text-muted">{email}</p>
        </div>
        <Button variant="ghost" onClick={handleLogout}>
          Se déconnecter
        </Button>
      </div>

      {error && <p className="text-red-400">{error}</p>}

      {groups && (
        <ul className="flex flex-col gap-2">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/admin/groupes/${g.code}`}
                className="flex items-center justify-between gap-3 bg-surface-2 border border-border rounded-xl px-4 py-3 hover:border-accent transition"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {g.name} <span className="text-xs text-muted">({g.code})</span>
                  </p>
                  <p className="text-xs text-muted">
                    {g.memberCount} membre{g.memberCount > 1 ? "s" : ""}
                    {g.pendingCount > 0 && ` · ${g.pendingCount} en attente`}
                    {g.isPublic && " · Public"} · Créé le {formatDateFr(g.createdAt)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
          {groups.length === 0 && <p className="text-muted">Aucun groupe créé pour l&apos;instant.</p>}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-xl">Activité récente</h2>
        {auditEntries && auditEntries.length === 0 && (
          <p className="text-muted text-sm">Aucune activité enregistrée pour l&apos;instant.</p>
        )}
        {auditEntries && auditEntries.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {auditEntries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 text-sm bg-surface-2 rounded-lg px-3 py-2">
                <span className="truncate">{formatAuditEntry(entry)}</span>
                <span className="text-xs text-muted shrink-0">
                  {entry.groupCode ? (
                    <Link href={`/admin/groupes/${entry.groupCode}`} className="hover:text-accent transition">
                      {entry.groupName}
                    </Link>
                  ) : (
                    "groupe supprimé"
                  )}
                  {" · "}
                  {formatDateFr(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
