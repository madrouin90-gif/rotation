"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMemberSession } from "@/hooks/useMemberSession";
import { Avatar } from "@/components/ui/Avatar";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { spotifyTypeLabelFr } from "@/lib/typeLabels";
import type { PalmaresEntry } from "@/types";

const PAGE_SIZE = 50;

export default function PalmaresPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useMemberSession(code);

  const [entries, setEntries] = useState<PalmaresEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading && !session) {
      router.replace(`/rejoindre?code=${code}`);
    }
  }, [sessionLoading, session, router, code]);

  useEffect(() => {
    if (!session) return;
    apiFetch<{ entries: PalmaresEntry[]; total: number }>(
      `/api/groups/${code}/palmares?limit=${PAGE_SIZE}&offset=0`,
      { token: session.token }
    )
      .then((res) => {
        setEntries(res.entries);
        setTotal(res.total);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger le palmarès."));
  }, [session, code]);

  async function loadMore() {
    if (!session || !entries) return;
    setLoadingMore(true);
    try {
      const res = await apiFetch<{ entries: PalmaresEntry[]; total: number }>(
        `/api/groups/${code}/palmares?limit=${PAGE_SIZE}&offset=${entries.length}`,
        { token: session.token }
      );
      setEntries([...entries, ...res.entries]);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de charger la suite du palmarès.");
    } finally {
      setLoadingMore(false);
    }
  }

  if (sessionLoading || !session) return null;

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 max-w-3xl mx-auto">
          <Link href={`/g/${code}`} className="text-muted hover:text-foreground transition cursor-pointer">
            ←
          </Link>
          <h1 className="font-display text-xl">🏆 Palmarès</h1>
        </div>
      </header>

      <div className="max-w-3xl w-full mx-auto flex-1 p-4 sm:p-6">
        {error && <p className="text-red-400 text-center mt-8">{error}</p>}

        {!error && entries && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-24 gap-2">
            <p className="text-4xl mb-2">🏆</p>
            <p className="text-muted">Personne n&apos;a encore noté de partage dans ce groupe.</p>
          </div>
        )}

        {!error && entries && entries.length > 0 && (
          <ul className="flex flex-col gap-3">
            {entries.map((entry, index) => {
              const expanded = expandedId === entry.item.id;
              return (
                <li key={entry.item.id} className="bg-surface rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : entry.item.id)}
                    className="w-full flex items-center gap-4 p-3 cursor-pointer text-left"
                  >
                    <span className="font-display text-lg text-muted w-6 text-center shrink-0">{index + 1}</span>
                    {entry.item.artwork_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entry.item.artwork_url}
                        alt={entry.item.title}
                        className="w-14 h-14 rounded-xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-surface-2 flex items-center justify-center text-xl shrink-0">
                        🎵
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{entry.item.title}</p>
                      <p className="text-sm text-muted truncate">
                        {entry.item.artist_name ? `${entry.item.artist_name} · ` : ""}
                        {spotifyTypeLabelFr(entry.item.type)}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Avatar emoji={entry.owner.avatarEmoji} color={entry.owner.avatarColor} size="xs" />
                        <span className="text-xs text-muted">{entry.owner.pseudo}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display text-lg text-accent">{entry.scoreOn100}/100</p>
                      <p className="text-xs text-muted">
                        {entry.votesCount} vote{entry.votesCount > 1 ? "s" : ""}
                      </p>
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-border p-3 flex flex-col gap-1.5">
                      {entry.votes.map((vote) => (
                        <div key={vote.memberId} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Avatar emoji={vote.avatarEmoji} color={vote.avatarColor} size="xs" />
                            <span>{vote.pseudo}</span>
                          </div>
                          <span className="text-muted tabular-nums">{vote.score}/10</span>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {!error && entries && entries.length > 0 && entries.length < total && (
          <div className="flex justify-center mt-4">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="text-sm text-accent hover:underline cursor-pointer disabled:opacity-50"
            >
              {loadingMore ? "Chargement..." : "Voir plus"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
