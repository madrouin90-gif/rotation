"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { ReactionBar } from "@/components/share/ReactionBar";
import { SpotifyEmbedPlayer } from "@/components/share/SpotifyEmbedPlayer";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { formatDateFr } from "@/lib/dates";
import { useToast } from "@/components/ui/Toast";
import { spotifyTypeLabelFr } from "@/lib/typeLabels";
import type { GroupSettings, MemberWithShares, ShareWithReactions } from "@/types";

interface ShareDetailModalProps {
  share: ShareWithReactions;
  member: Pick<MemberWithShares, "id" | "pseudo" | "avatar_emoji" | "avatar_color">;
  settings: GroupSettings;
  token: string;
  onClose: () => void;
  onChanged: () => void;
}

export function ShareDetailModal({ share, member, settings, token, onClose, onChanged }: ShareDetailModalProps) {
  const { showError } = useToast();
  const [pending, setPending] = useState(false);

  async function handleToggleReaction(emoji: string) {
    setPending(true);
    try {
      await apiFetch("/api/reactions", { method: "POST", token, body: { shareId: share.id, emoji } });
      onChanged();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible d'enregistrer la réaction.");
    } finally {
      setPending(false);
    }
  }

  const { item } = share;

  return (
    <Modal onClose={onClose}>
      <div className="relative">
        {item.artwork_url && (
          <div
            className="absolute inset-x-0 top-0 h-64 overflow-hidden opacity-40 pointer-events-none"
            aria-hidden
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.artwork_url} alt="" className="w-full h-full object-cover blur-3xl scale-150 saturate-150" />
          </div>
        )}

        <div className="relative p-6 sm:p-8 flex flex-col gap-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition cursor-pointer z-10"
            aria-label="Fermer"
          >
            ✕
          </button>

          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {item.artwork_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.artwork_url}
                alt={item.title}
                className="w-40 h-40 sm:w-52 sm:h-52 rounded-2xl object-cover shadow-2xl shrink-0 mx-auto sm:mx-0"
              />
            ) : (
              <div className="w-40 h-40 sm:w-52 sm:h-52 rounded-2xl bg-surface-2 flex items-center justify-center text-6xl shrink-0 mx-auto sm:mx-0">
                🎵
              </div>
            )}

            <div className="flex flex-col gap-2 min-w-0">
              <span className="text-xs uppercase tracking-wide text-accent font-medium">
                {spotifyTypeLabelFr(item.type)}
              </span>
              <h2 className="font-display text-2xl sm:text-3xl leading-tight">{item.title}</h2>
              {item.artist_name && <p className="text-muted text-lg">{item.artist_name}</p>}
              <p className="text-xs text-muted mt-2">
                Ajouté pour la 1<sup>re</sup> fois le {formatDateFr(item.first_added_at)}
              </p>
              <a
                href={item.spotify_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:underline mt-1 w-fit"
              >
                Ouvrir dans Spotify ↗
              </a>
            </div>
          </div>

          <SpotifyEmbedPlayer type={item.type} spotifyId={item.spotify_id} />

          {share.note && (
            <div className="flex gap-3 items-start bg-surface-2 rounded-2xl p-4">
              <Avatar emoji={member.avatar_emoji} color={member.avatar_color} size="sm" />
              <div>
                <p className="text-sm font-medium mb-0.5">{member.pseudo}</p>
                <p className="text-sm text-muted">{share.note}</p>
              </div>
            </div>
          )}

          <ReactionBar
            emojis={settings.reaction_emojis}
            reactions={share.reactions}
            onToggle={handleToggleReaction}
            disabled={pending}
          />
        </div>
      </div>
    </Modal>
  );
}
