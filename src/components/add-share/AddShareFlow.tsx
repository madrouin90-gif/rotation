"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ReplaceSlotPicker } from "@/components/add-share/ReplaceSlotPicker";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { spotifyTypeLabelFr } from "@/lib/typeLabels";
import type { GroupSettings, ShareWithReactions, SpotifyPreview } from "@/types";

interface AddShareFlowProps {
  token: string;
  settings: GroupSettings;
  myShares: ShareWithReactions[];
  forcedReplaceRank?: number;
  /** Pré-remplit et lance la prévisualisation immédiatement — ex. lien reçu via le partage
   * natif (Web Share Target) depuis Spotify. */
  initialUrl?: string;
  onClose: () => void;
  onChanged: () => void;
}

type Step = "link" | "details" | "replace";

export function AddShareFlow({
  token,
  settings,
  myShares,
  forcedReplaceRank,
  initialUrl,
  onClose,
  onChanged,
}: AddShareFlowProps) {
  const [step, setStep] = useState<Step>("link");
  const [url, setUrl] = useState(initialUrl ?? "");
  const [note, setNote] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [preview, setPreview] = useState<SpotifyPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notesEnabled = settings.note_max_length > 0;
  const slotsFull = myShares.length >= settings.slots_per_member;

  useEffect(() => {
    if (initialUrl) handlePreview(initialUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePreview(overrideUrl?: string) {
    const target = overrideUrl ?? url;
    setError(null);
    setLoadingPreview(true);
    try {
      const result = await apiFetch<SpotifyPreview>("/api/items/preview", {
        method: "POST",
        token,
        body: { url: target },
      });
      setPreview(result);
      setStep("details");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de charger ce lien.");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handlePaste() {
    setError(null);
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        setError("Le presse-papier est vide.");
        return;
      }
      setUrl(text);
      handlePreview(text);
    } catch {
      setError("Impossible d'accéder au presse-papier — colle le lien manuellement (Ctrl/Cmd+V).");
    }
  }

  function toggleGenre(genre: string) {
    setGenres((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]));
  }

  async function submitShare(replaceRank?: number) {
    if (!preview) return;
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/shares", {
        method: "POST",
        token,
        body: { spotifyUrl: preview.canonicalUrl, note, genres, replaceRank: forcedReplaceRank ?? replaceRank },
      });
      onChanged();
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setStep("replace");
      } else {
        setError(e instanceof ApiError ? e.message : "Impossible d'ajouter ce partage.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} fullscreenOnMobile={false}>
      <div className="p-6 sm:p-8 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Partager sur Rotation</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground transition cursor-pointer" aria-label="Fermer">
            ✕
          </button>
        </div>

        {step === "link" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">Colle un lien Spotify (chanson, album ou artiste).</p>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <Input
                  autoFocus
                  placeholder="https://open.spotify.com/track/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && url.trim() && handlePreview()}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handlePaste}
                disabled={loadingPreview}
                title="Coller depuis le presse-papier"
              >
                📋
              </Button>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button disabled={!url.trim() || loadingPreview} onClick={() => handlePreview()}>
              {loadingPreview ? "Chargement..." : "Prévisualiser"}
            </Button>
          </div>
        )}

        {step === "details" && preview && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-4 items-center bg-surface-2 rounded-2xl p-3">
              {preview.artworkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.artworkUrl} alt={preview.title} className="w-16 h-16 rounded-xl object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-surface flex items-center justify-center text-2xl">🎵</div>
              )}
              <div className="min-w-0">
                <span className="text-xs uppercase tracking-wide text-accent">{spotifyTypeLabelFr(preview.type)}</span>
                <p className="font-medium truncate">{preview.title}</p>
                {preview.artistName && <p className="text-sm text-muted truncate">{preview.artistName}</p>}
              </div>
            </div>

            {settings.genre_tags.length > 0 && (
              <div>
                <p className="text-xs text-muted mb-2">Genres (optionnel)</p>
                <div className="flex flex-wrap gap-2">
                  {settings.genre_tags.map((genre) => {
                    const selected = genres.includes(genre);
                    return (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => toggleGenre(genre)}
                        className={`px-2.5 py-1.5 rounded-full text-sm border transition cursor-pointer ${
                          selected ? "bg-accent/20 border-accent text-foreground" : "bg-surface-2 border-border text-muted"
                        }`}
                      >
                        {genre}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {notesEnabled && (
              <div>
                <textarea
                  value={note}
                  maxLength={settings.note_max_length}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Un mot sur ce partage (optionnel)"
                  rows={3}
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent transition resize-none"
                />
                <p className="text-xs text-muted text-right mt-1">
                  {note.length}/{settings.note_max_length}
                </p>
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep("link")} disabled={submitting}>
                Retour
              </Button>
              <Button className="flex-1" disabled={submitting} onClick={() => submitShare()}>
                {submitting
                  ? "Envoi..."
                  : forcedReplaceRank !== undefined
                    ? `Remplacer le slot #${forcedReplaceRank}`
                    : slotsFull
                      ? "Continuer"
                      : "Partager"}
              </Button>
            </div>
          </div>
        )}

        {step === "replace" && preview && (
          <div className="flex flex-col gap-4">
            <ReplaceSlotPicker shares={myShares} onPick={(rank) => submitShare(rank)} disabled={submitting} />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button variant="secondary" onClick={() => setStep("details")} disabled={submitting}>
              Retour
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
