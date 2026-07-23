"use client";

import { useState } from "react";
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { isShareNew } from "@/lib/dates";
import { NoteEditor } from "@/components/share/NoteEditor";
import { GenreEditor } from "@/components/share/GenreEditor";
import type { GroupSettings, ShareWithReactions } from "@/types";

interface SlotCardProps {
  rank: number;
  share?: ShareWithReactions;
  settings: GroupSettings;
  isMe: boolean;
  dragHandleAttributes?: DraggableAttributes;
  dragHandleListeners?: DraggableSyntheticListeners;
  onOpenDetail?: () => void;
  onRemove?: () => void;
  onSaveNote?: (note: string) => Promise<void> | void;
  onSaveGenres?: (genres: string[]) => Promise<void> | void;
  onReplace?: () => void;
  onAddEmpty?: () => void;
}

export function SlotCard({
  rank,
  share,
  settings,
  isMe,
  dragHandleAttributes,
  dragHandleListeners,
  onOpenDetail,
  onRemove,
  onSaveNote,
  onSaveGenres,
  onReplace,
  onAddEmpty,
}: SlotCardProps) {
  const [editingNote, setEditingNote] = useState(false);
  const [editingGenres, setEditingGenres] = useState(false);
  const isTopPick = settings.highlight_top_pick && rank === 1;

  if (!share) {
    return (
      <button
        type="button"
        onClick={onAddEmpty}
        disabled={!isMe}
        className={`aspect-square rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted transition ${
          isMe ? "hover:border-accent hover:text-accent cursor-pointer" : "opacity-40"
        }`}
      >
        <span className="text-2xl">+</span>
        {isMe && <span className="text-xs">Ajouter</span>}
      </button>
    );
  }

  const isNew = isShareNew(share.added_at, settings.new_badge_days);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-surface-2 transition-transform ${
        isTopPick ? "ring-2 ring-accent shadow-lg shadow-accent/20 sm:scale-105" : ""
      }`}
    >
      <button
        type="button"
        onClick={onOpenDetail}
        className="w-full aspect-square block cursor-pointer"
        {...(isMe ? dragHandleAttributes : {})}
        {...(isMe ? dragHandleListeners : {})}
      >
        {share.item.artwork_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={share.item.artwork_url} alt={share.item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🎵</div>
        )}
      </button>

      {isTopPick && (
        <span className="absolute top-2 left-2 text-[10px] font-medium uppercase bg-accent text-white px-2 py-0.5 rounded-full pointer-events-none">
          Top pick
        </span>
      )}
      {isNew && (
        <span className="absolute top-2 right-2 text-[10px] font-medium uppercase bg-accent-2 text-white px-2 py-0.5 rounded-full pointer-events-none">
          Nouveau
        </span>
      )}
      <span className="absolute bottom-2 left-2 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded-full pointer-events-none">
        #{rank}
      </span>

      {isMe && (
        <div className="absolute bottom-2 right-2 flex gap-1">
          <button
            type="button"
            onClick={onRemove}
            className="w-7 h-7 rounded-full bg-black/50 hover:bg-red-500/80 text-white text-xs flex items-center justify-center transition cursor-pointer"
            aria-label="Retirer ce partage"
          >
            ✕
          </button>
        </div>
      )}

      <div className="p-3 bg-surface">
        <p className="text-sm font-medium truncate">{share.item.title}</p>
        {share.item.artist_name && <p className="text-xs text-muted truncate">{share.item.artist_name}</p>}

        {isMe && (
          <div className="mt-2">
            {editingNote ? (
              <NoteEditor
                initialNote={share.note ?? ""}
                maxLength={settings.note_max_length}
                onCancel={() => setEditingNote(false)}
                onSave={async (note) => {
                  await onSaveNote?.(note);
                  setEditingNote(false);
                }}
              />
            ) : settings.note_max_length > 0 ? (
              <button
                type="button"
                onClick={() => setEditingNote(true)}
                className="text-xs text-muted hover:text-accent transition cursor-pointer text-left w-full truncate"
              >
                {share.note ? `“${share.note}”` : "+ Ajouter une note"}
              </button>
            ) : null}

            {settings.genre_tags.length > 0 && (
              <div className="mt-1.5">
                {editingGenres ? (
                  <GenreEditor
                    initialGenres={share.item.genres}
                    availableGenres={settings.genre_tags}
                    onCancel={() => setEditingGenres(false)}
                    onSave={async (genres) => {
                      await onSaveGenres?.(genres);
                      setEditingGenres(false);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingGenres(true)}
                    className="text-xs text-muted hover:text-accent transition cursor-pointer text-left w-full truncate"
                  >
                    {share.item.genres.length > 0 ? share.item.genres.join(", ") : "+ Ajouter des genres"}
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={onReplace}
              className="text-xs text-muted hover:text-accent transition cursor-pointer mt-1"
            >
              Remplacer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
