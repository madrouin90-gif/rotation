"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ReactionBar } from "@/components/share/ReactionBar";
import { RatingWidget } from "@/components/share/RatingWidget";
import { SpotifyEmbedPlayer } from "@/components/share/SpotifyEmbedPlayer";
import { NoteEditor } from "@/components/share/NoteEditor";
import { GenreEditor } from "@/components/share/GenreEditor";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { formatDateFr } from "@/lib/dates";
import { useToast } from "@/components/ui/Toast";
import { spotifyTypeLabelFr } from "@/lib/typeLabels";
import { spotifyAppUri } from "@/lib/spotifyUri";
import type { Comment, GroupSettings, MemberWithShares, ShareWithReactions } from "@/types";

interface ShareDetailModalProps {
  share: ShareWithReactions;
  member: Pick<MemberWithShares, "id" | "pseudo" | "avatar_emoji" | "avatar_color">;
  settings: GroupSettings;
  token: string;
  myMemberId: string;
  isMe: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onChanged: () => void;
  onSaveNote?: (note: string) => Promise<void> | void;
  onSaveGenres?: (genres: string[]) => Promise<void> | void;
  onRemove?: () => Promise<void> | void;
}

export function ShareDetailModal({
  share,
  member,
  settings,
  token,
  myMemberId,
  isMe,
  isAdmin,
  onClose,
  onChanged,
  onSaveNote,
  onSaveGenres,
  onRemove,
}: ShareDetailModalProps) {
  const { showError } = useToast();
  const [pending, setPending] = useState(false);
  const [favoritePending, setFavoritePending] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [editingGenres, setEditingGenres] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    if (!onRemove) return;
    setRemoving(true);
    try {
      await onRemove();
    } finally {
      setRemoving(false);
    }
  }

  const { item } = share;
  const comments: Comment[] = item.comments ?? [];

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

  async function handleToggleFavorite() {
    setFavoritePending(true);
    try {
      await apiFetch("/api/favorites", { method: "POST", token, body: { itemId: item.id } });
      onChanged();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible de mettre à jour tes favoris.");
    } finally {
      setFavoritePending(false);
    }
  }

  async function handlePostComment() {
    const body = commentBody.trim();
    if (!body) return;
    setPostingComment(true);
    try {
      await apiFetch("/api/comments", { method: "POST", token, body: { itemId: item.id, shareId: share.id, body } });
      setCommentBody("");
      onChanged();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible de publier le commentaire.");
    } finally {
      setPostingComment(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      await apiFetch(`/api/comments/${commentId}`, { method: "DELETE", token });
      onChanged();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible de retirer ce commentaire.");
    }
  }

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

          <button
            onClick={handleToggleFavorite}
            disabled={favoritePending}
            className="absolute top-4 left-4 sm:top-6 sm:left-6 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition cursor-pointer z-10"
            aria-label={item.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            title={item.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            {item.isFavorite ? "★" : "☆"}
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

              {isMe && onSaveGenres && settings.genre_tags.length > 0 ? (
                editingGenres ? (
                  <GenreEditor
                    initialGenres={item.genres}
                    availableGenres={settings.genre_tags}
                    onCancel={() => setEditingGenres(false)}
                    onSave={async (genres) => {
                      await onSaveGenres(genres);
                      setEditingGenres(false);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingGenres(true)}
                    className="text-sm text-muted hover:text-accent transition cursor-pointer text-left w-fit"
                  >
                    {item.genres.length > 0 ? item.genres.join(", ") : "+ Ajouter des genres"}
                  </button>
                )
              ) : (
                item.genres.length > 0 && <p className="text-sm text-muted">{item.genres.join(", ")}</p>
              )}

              <p className="text-xs text-muted mt-2">
                Ajouté pour la 1<sup>re</sup> fois le {formatDateFr(item.first_added_at)}
              </p>
              <a
                href={spotifyAppUri(item.type, item.spotify_id)}
                className="text-sm text-accent hover:underline mt-1 w-fit"
              >
                Ouvrir dans Spotify ↗
              </a>
              {isMe && onRemove && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={removing}
                  className="text-sm text-red-400 hover:underline mt-1 w-fit text-left cursor-pointer disabled:opacity-50"
                >
                  {removing ? "..." : "Retirer ce partage"}
                </button>
              )}
            </div>
          </div>

          <SpotifyEmbedPlayer type={item.type} spotifyId={item.spotify_id} />

          {isMe && onSaveNote && settings.note_max_length > 0 ? (
            <div className="flex gap-3 items-start bg-surface-2 rounded-2xl p-4">
              <Avatar emoji={member.avatar_emoji} color={member.avatar_color} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium mb-0.5">{member.pseudo}</p>
                {editingNote ? (
                  <NoteEditor
                    initialNote={share.note ?? ""}
                    maxLength={settings.note_max_length}
                    onCancel={() => setEditingNote(false)}
                    onSave={async (note) => {
                      await onSaveNote(note);
                      setEditingNote(false);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingNote(true)}
                    className="text-sm text-muted hover:text-accent transition cursor-pointer text-left w-full"
                  >
                    {share.note ? `"${share.note}"` : "+ Ajouter une note"}
                  </button>
                )}
              </div>
            </div>
          ) : (
            share.note && (
              <div className="flex gap-3 items-start bg-surface-2 rounded-2xl p-4">
                <Avatar emoji={member.avatar_emoji} color={member.avatar_color} size="sm" />
                <div>
                  <p className="text-sm font-medium mb-0.5">{member.pseudo}</p>
                  <p className="text-sm text-muted">{share.note}</p>
                </div>
              </div>
            )
          )}

          <ReactionBar
            emojis={settings.reaction_emojis}
            reactions={share.reactions}
            onToggle={handleToggleReaction}
            disabled={pending}
          />

          {((item.rating?.votesCount ?? 0) > 0 || !isMe) && (
            <div className="flex items-center justify-between gap-3 bg-surface-2 rounded-2xl p-4">
              {(item.rating?.votesCount ?? 0) > 0 ? (
                <p className="text-sm text-accent">
                  🏆 {item.rating!.scoreOn100}/100 · {item.rating!.votesCount} vote
                  {item.rating!.votesCount > 1 ? "s" : ""}
                </p>
              ) : (
                <p className="text-sm text-muted">Pas encore noté</p>
              )}
              {!isMe && (
                <RatingWidget itemId={item.id} token={token} myScore={item.rating?.myScore ?? null} onRated={onChanged} />
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-muted">
              💬 Commentaires{comments.length > 0 ? ` (${comments.length})` : ""}
            </h3>

            {comments.length > 0 && (
              <ul className="flex flex-col gap-3">
                {comments.map((comment) => (
                  <li key={comment.id} className="flex gap-3 items-start bg-surface-2 rounded-2xl p-3">
                    <Avatar emoji={comment.author.avatarEmoji} color={comment.author.avatarColor} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{comment.author.pseudo}</p>
                        <span className="text-xs text-muted shrink-0">{formatDateFr(comment.createdAt)}</span>
                      </div>
                      <p className="text-sm text-muted break-words">{comment.body}</p>
                    </div>
                    {(comment.author.id === myMemberId || isAdmin) && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-muted hover:text-red-400 transition cursor-pointer text-xs shrink-0"
                        aria-label="Retirer ce commentaire"
                      >
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-col gap-2">
              <textarea
                value={commentBody}
                maxLength={500}
                onChange={(e) => setCommentBody(e.target.value)}
                rows={2}
                placeholder="Écris un commentaire..."
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent transition resize-none"
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={handlePostComment} disabled={postingComment || !commentBody.trim()}>
                  {postingComment ? "..." : "Publier"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
