"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { formatDateFr } from "@/lib/dates";
import { spotifyAppUri } from "@/lib/spotifyUri";
import type { HistoryEvent } from "@/types";

interface RecentActivitySidebarProps {
  groupCode: string;
  token: string;
}

export function RecentActivitySidebar({ groupCode, token }: RecentActivitySidebarProps) {
  const [events, setEvents] = useState<HistoryEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ events: HistoryEvent[] }>(`/api/groups/${groupCode}/history?limit=30`, { token })
      .then((res) => setEvents(res.events))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger l'activité récente."));
  }, [groupCode, token]);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-lg px-1">Activité récente</h2>

      {error && <p className="text-xs text-red-400 px-1">{error}</p>}

      {!error && events && events.length === 0 && <p className="text-xs text-muted px-1">Rien pour l&apos;instant.</p>}

      {!error && events && events.length > 0 && (
        <ul className="flex flex-col gap-2">
          {events.map((event) => (
            <li key={event.id}>
              <a
                href={spotifyAppUri(event.item.type, event.item.spotify_id)}
                className="flex items-center gap-2.5 bg-surface rounded-xl p-2 hover:bg-surface-2 transition cursor-pointer"
              >
                {event.item.artwork_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.item.artwork_url}
                    alt={event.item.title}
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center text-sm shrink-0">
                    🎵
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{event.item.title}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Avatar emoji={event.member.avatarEmoji} color={event.member.avatarColor} size="xs" />
                    <span className="text-[11px] text-muted truncate">{event.member.pseudo}</span>
                  </div>
                </div>
                <span className="text-[10px] text-muted shrink-0">{formatDateFr(event.occurredAt)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
