"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMemberSession } from "@/hooks/useMemberSession";
import { useGroupData } from "@/hooks/useGroupData";
import { HistoryFilters } from "@/components/history/HistoryFilters";
import { Avatar } from "@/components/ui/Avatar";
import { ListenButton } from "@/components/share/ListenButton";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { formatDateFr } from "@/lib/dates";
import { spotifyTypeLabelFr } from "@/lib/typeLabels";
import type { HistoryEvent } from "@/types";

export default function HistoriquePage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useMemberSession(code);
  const { data: groupData } = useGroupData(code, session?.token ?? null);

  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [events, setEvents] = useState<HistoryEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading && !session) router.replace(`/rejoindre?code=${code}`);
  }, [sessionLoading, session, router, code]);

  useEffect(() => {
    if (!session) return;
    const query = new URLSearchParams();
    if (selectedMemberIds.length > 0) query.set("memberIds", selectedMemberIds.join(","));
    if (selectedGenres.length > 0) query.set("genres", selectedGenres.join(","));
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    query.set("limit", "100");

    apiFetch<{ events: HistoryEvent[] }>(`/api/groups/${code}/history?${query.toString()}`, { token: session.token })
      .then((res) => setEvents(res.events))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger l'historique."));
  }, [session, code, selectedMemberIds, selectedGenres, from, to]);

  if (sessionLoading || !session) return null;

  function toggleMember(memberId: string) {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  }

  function toggleGenre(genre: string) {
    setSelectedGenres((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]));
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 max-w-3xl mx-auto">
          <Link href={`/g/${code}`} className="text-muted hover:text-foreground transition cursor-pointer">
            ←
          </Link>
          <h1 className="font-display text-xl">🕒 Historique</h1>
        </div>
      </header>

      <div className="max-w-3xl w-full mx-auto flex-1 p-4 sm:p-6 flex flex-col gap-4">
        {groupData && (
          <HistoryFilters
            members={groupData.members}
            selectedMemberIds={selectedMemberIds}
            onToggleMember={toggleMember}
            genres={groupData.group.settings.genre_tags}
            selectedGenres={selectedGenres}
            onToggleGenre={toggleGenre}
            from={from}
            to={to}
            onChangeFrom={setFrom}
            onChangeTo={setTo}
            onReset={() => {
              setSelectedMemberIds([]);
              setSelectedGenres([]);
              setFrom("");
              setTo("");
            }}
          />
        )}

        {error && <p className="text-red-400 text-center mt-8">{error}</p>}

        {!error && events && events.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-24 gap-2">
            <p className="text-4xl mb-2">🕒</p>
            <p className="text-muted">Aucun partage ne correspond à ces filtres.</p>
          </div>
        )}

        {!error && events && events.length > 0 && (
          <ul className="flex flex-col gap-3">
            {events.map((event) => (
              <li key={event.id} className="flex items-center gap-4 bg-surface rounded-2xl p-3">
                {event.item.artwork_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.item.artwork_url}
                    alt={event.item.title}
                    className="w-14 h-14 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-surface-2 flex items-center justify-center text-xl shrink-0">
                    🎵
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{event.item.title}</p>
                  <p className="text-sm text-muted truncate">
                    {event.item.artist_name ? `${event.item.artist_name} · ` : ""}
                    {spotifyTypeLabelFr(event.item.type)}
                    {event.item.genres.length > 0 ? ` · ${event.item.genres.join(", ")}` : ""}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Avatar emoji={event.member.avatarEmoji} color={event.member.avatarColor} size="xs" />
                    <span className="text-xs text-muted">{event.member.pseudo}</span>
                    <span className="text-xs text-muted">· {formatDateFr(event.occurredAt)}</span>
                  </div>
                </div>
                <ListenButton
                  type={event.item.type}
                  spotifyId={event.item.spotify_id}
                  className="static bg-surface-2 hover:bg-accent"
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
