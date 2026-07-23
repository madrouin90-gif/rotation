"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMemberSession } from "@/hooks/useMemberSession";
import { Avatar } from "@/components/ui/Avatar";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { formatDateFr } from "@/lib/dates";
import { spotifyTypeLabelFr } from "@/lib/typeLabels";
import { spotifyAppUri } from "@/lib/spotifyUri";
import type { FavoriteEntry } from "@/types";

export default function FavorisPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useMemberSession(code);

  const [entries, setEntries] = useState<FavoriteEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading && !session) router.replace(`/rejoindre?code=${code}`);
  }, [sessionLoading, session, router, code]);

  useEffect(() => {
    if (!session) return;
    apiFetch<{ groupName: string; entries: FavoriteEntry[] }>(`/api/groups/${code}/favorites`, {
      token: session.token,
    })
      .then((res) => setEntries(res.entries))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger tes favoris."));
  }, [session, code]);

  if (sessionLoading || !session) return null;

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 max-w-3xl mx-auto">
          <Link href={`/g/${code}`} className="text-muted hover:text-foreground transition cursor-pointer">
            ←
          </Link>
          <h1 className="font-display text-xl">★ Mes favoris</h1>
        </div>
      </header>

      <div className="max-w-3xl w-full mx-auto flex-1 p-4 sm:p-6">
        {error && <p className="text-red-400 text-center mt-8">{error}</p>}

        {!error && entries && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-24 gap-2">
            <p className="text-4xl mb-2">☆</p>
            <p className="text-muted">Aucun favori pour l&apos;instant. Ouvre une chanson et clique sur l&apos;étoile.</p>
          </div>
        )}

        {!error && entries && entries.length > 0 && (
          <ul className="flex flex-col gap-3">
            {entries.map((entry) => (
              <li key={entry.item.id}>
                <a
                  href={spotifyAppUri(entry.item.type, entry.item.spotify_id)}
                  className="flex items-center gap-4 bg-surface rounded-2xl p-3 hover:bg-surface-2 transition cursor-pointer"
                >
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
                      <span className="text-xs text-muted">· ajouté le {formatDateFr(entry.favoritedAt)}</span>
                    </div>
                  </div>
                  <span className="text-accent shrink-0">★</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
