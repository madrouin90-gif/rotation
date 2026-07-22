"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemberSession } from "@/hooks/useMemberSession";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { formatDateFr } from "@/lib/dates";
import { spotifyTypeLabelFr } from "@/lib/typeLabels";
import type { ArchiveEntry } from "@/types";

export default function ArchivePage() {
  const params = useParams<{ code: string; memberId: string }>();
  const code = (params.code ?? "").toUpperCase();
  const memberId = params.memberId ?? "";
  const { session, isLoading: sessionLoading } = useMemberSession(code);

  const [pseudo, setPseudo] = useState<string | null>(null);
  const [entries, setEntries] = useState<ArchiveEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    apiFetch<{ pseudo: string; entries: ArchiveEntry[] }>(`/api/members/${memberId}/archive`, { token: session.token })
      .then((res) => {
        setPseudo(res.pseudo);
        setEntries(res.entries);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger l'archive."));
  }, [session, memberId]);

  if (sessionLoading || !session) return null;

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 max-w-3xl mx-auto">
          <Link href={`/g/${code}/membre/${memberId}`} className="text-muted hover:text-foreground transition cursor-pointer">
            ←
          </Link>
          <h1 className="font-display text-xl truncate">Archive {pseudo ? `de ${pseudo}` : ""}</h1>
        </div>
      </header>

      <div className="max-w-3xl w-full mx-auto flex-1 p-4 sm:p-6">
        {error && <p className="text-red-400 text-center mt-8">{error}</p>}

        {!error && entries && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-24 gap-2">
            <p className="text-4xl mb-2">📼</p>
            <p className="text-muted">Aucun partage dans cette archive pour l&apos;instant.</p>
          </div>
        )}

        {!error && entries && entries.length > 0 && (
          <ul className="flex flex-col gap-3">
            {entries.map((entry) => (
              <li key={entry.item.id} className="flex items-center gap-4 bg-surface rounded-2xl p-3">
                {entry.item.artwork_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.item.artwork_url} alt={entry.item.title} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-surface-2 flex items-center justify-center text-xl shrink-0">🎵</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{entry.item.title}</p>
                  <p className="text-sm text-muted truncate">
                    {entry.item.artist_name ? `${entry.item.artist_name} · ` : ""}
                    {spotifyTypeLabelFr(entry.item.type)}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    Ajouté pour la 1<sup>re</sup> fois le {formatDateFr(entry.item.first_added_at)}
                  </p>
                </div>
                {entry.isActive && entry.activeShare && (
                  <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full shrink-0">
                    Actif · #{entry.activeShare.rank}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
