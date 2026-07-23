"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { formatDateFr } from "@/lib/dates";
import { spotifyAppUri } from "@/lib/spotifyUri";
import type { ChatEntry } from "@/types";

const POLL_MS = 7000;

interface GroupChatPanelProps {
  groupCode: string;
  token: string;
  myMemberId: string;
  isAdmin: boolean;
}

export function GroupChatPanel({ groupCode, token, myMemberId, isAdmin }: GroupChatPanelProps) {
  const { showError } = useToast();
  const [entries, setEntries] = useState<ChatEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  function load() {
    apiFetch<{ entries: ChatEntry[] }>(`/api/groups/${groupCode}/chat?limit=100`, { token })
      .then((res) => setEntries(res.entries))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Impossible de charger le chat."));
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupCode, token]);

  async function handlePost() {
    const text = body.trim();
    if (!text) return;
    setPosting(true);
    try {
      await apiFetch(`/api/groups/${groupCode}/chat`, { method: "POST", token, body: { body: text } });
      setBody("");
      load();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible d'envoyer le message.");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(entry: ChatEntry) {
    try {
      const path = entry.kind === "comment" ? `/api/comments/${entry.id}` : `/api/group-messages/${entry.id}`;
      await apiFetch(path, { method: "DELETE", token });
      load();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible de retirer ce message.");
    }
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      <h2 className="font-display text-lg px-1">💬 Chat du groupe</h2>

      {error && <p className="text-xs text-red-400 px-1">{error}</p>}

      {!error && entries && entries.length === 0 && (
        <p className="text-xs text-muted px-1">Rien pour l&apos;instant — commente une chanson ou écris ici.</p>
      )}

      {!error && entries && entries.length > 0 && (
        <ul className="flex flex-col gap-2 overflow-y-auto flex-1">
          {entries.map((entry) => (
            <li key={`${entry.kind}-${entry.id}`} className="flex gap-2 items-start bg-surface rounded-xl p-2">
              <Avatar emoji={entry.author.avatarEmoji} color={entry.author.avatarColor} size="xs" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium truncate">{entry.author.pseudo}</span>
                  <span className="text-[10px] text-muted shrink-0">{formatDateFr(entry.createdAt)}</span>
                </div>
                {entry.item && (
                  <a
                    href={spotifyAppUri(entry.item.type, entry.item.spotifyId)}
                    className="text-[11px] text-accent hover:underline truncate block"
                  >
                    🎵 {entry.item.title}
                  </a>
                )}
                <p className="text-xs text-muted break-words">{entry.body}</p>
              </div>
              {(entry.author.id === myMemberId || isAdmin) && (
                <button
                  onClick={() => handleDelete(entry)}
                  className="text-muted hover:text-red-400 transition cursor-pointer text-xs shrink-0"
                  aria-label="Retirer ce message"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 shrink-0">
        <textarea
          value={body}
          maxLength={500}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Écris un message au groupe..."
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent transition resize-none"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={handlePost} disabled={posting || !body.trim()}>
            {posting ? "..." : "Publier"}
          </Button>
        </div>
      </div>
    </div>
  );
}
