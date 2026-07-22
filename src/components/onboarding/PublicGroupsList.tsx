"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { PublicGroupSummary } from "@/types";

interface PublicGroupsListProps {
  onSelect: (code: string) => void;
}

export function PublicGroupsList({ onSelect }: PublicGroupsListProps) {
  const [groups, setGroups] = useState<PublicGroupSummary[] | null>(null);

  useEffect(() => {
    apiFetch<{ groups: PublicGroupSummary[] }>("/api/groups/directory")
      .then((res) => setGroups(res.groups))
      .catch(() => setGroups([]));
  }, []);

  if (!groups || groups.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">Groupes publics</p>
      <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
        {groups.map((g) => {
          const full = g.memberCount >= g.maxMembers;
          return (
            <button
              key={g.code}
              type="button"
              disabled={full}
              onClick={() => onSelect(g.code)}
              className="flex items-center justify-between gap-3 bg-surface-2 border border-border rounded-xl px-4 py-3 text-left transition hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{g.name}</p>
                <p className="text-xs text-muted">
                  {g.memberCount}/{g.maxMembers} membres
                  {g.requireApproval && " · Approbation requise"}
                </p>
              </div>
              {full && <span className="text-xs text-muted shrink-0">Complet</span>}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="flex-1 border-t border-border" />
        <span>ou entre un code</span>
        <span className="flex-1 border-t border-border" />
      </div>
    </div>
  );
}
