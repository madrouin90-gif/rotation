"use client";

import { useState } from "react";
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
  onClose: () => void;
  onChanged: () => void;
}

type Step = "link" | "details" | "replace";

export function AddShareFlow({ token, settings, myShares, forcedReplaceRank, onClose, onChanged }: AddShareFlowProps) {
  const [step, setStep] = useState<Step>("link");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<SpotifyPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notesEnabled = settings.note_max_length > 0;
  const slotsFull = myShares.length >= settings.slots_per_member;

  async function handlePreview() {
    setError(null);
    setLoadingPreview(true);
    try {
      const result = await apiFetch<SpotifyPreview>("/api/items/preview", { method: "POST", token, body: { url } });
      setPreview(result);
      setStep("details");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de charger ce lien.");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function submitShare(replaceRank?: number) {
    if (!preview) return;
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/shares", {
        method: "POST",
        token,
        body: { spotifyUrl: preview.canonicalUrl, note, replaceRank: forcedReplaceRank ?? replaceRank },
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
            <Input
              autoFocus
              placeholder="https://open.spotify.com/track/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && url.trim() && handlePreview()}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button disabled={!url.trim() || loadingPreview} onClick={handlePreview}>
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
