"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Stepper } from "@/components/ui/Stepper";
import { Toggle } from "@/components/ui/Toggle";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { DEFAULT_SETTINGS, SETTINGS_BOUNDS, type SlotReductionImpact } from "@/lib/settings";
import { CANDIDATE_REACTION_EMOJIS } from "@/lib/reactionEmojis";
import { spotifyTypeLabelFr } from "@/lib/typeLabels";
import type { GroupSettings, SortMode, SpotifyItemType } from "@/types";

interface ParamsSectionProps {
  token: string;
  groupCode: string;
  settings: GroupSettings;
  onRefresh: () => void;
}

const ALL_TYPES: SpotifyItemType[] = ["track", "album", "artist"];

function diffPatch(current: GroupSettings, draft: GroupSettings): Partial<GroupSettings> {
  const patch: Partial<GroupSettings> = {};
  (Object.keys(draft) as (keyof GroupSettings)[]).forEach((key) => {
    if (JSON.stringify(draft[key]) !== JSON.stringify(current[key])) {
      (patch as Record<string, unknown>)[key] = draft[key];
    }
  });
  return patch;
}

type PendingAction = { action: "update_settings"; patch: Partial<GroupSettings> } | { action: "reset_defaults" };

export function ParamsSection({ token, groupCode, settings, onRefresh }: ParamsSectionProps) {
  const { showError, showSuccess } = useToast();
  const [saving, setSaving] = useState(false);
  const [newGenre, setNewGenre] = useState("");
  const [pending, setPending] = useState<{ action: PendingAction; impact: SlotReductionImpact[] } | null>(null);

  // Le brouillon suit les settings du serveur tant qu'aucune modification locale n'est en cours ;
  // dès que le prop `settings` change (ex. après un refresh post-sauvegarde), on réaligne le brouillon.
  // Ajustement pendant le rendu plutôt qu'un effect, voir
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const settingsKey = JSON.stringify(settings);
  const [draftState, setDraftState] = useState(() => ({ baselineKey: settingsKey, draft: settings }));
  if (draftState.baselineKey !== settingsKey) {
    setDraftState({ baselineKey: settingsKey, draft: settings });
  }
  const draft = draftState.draft;
  function setDraft(updater: GroupSettings | ((prev: GroupSettings) => GroupSettings)) {
    setDraftState((s) => ({
      ...s,
      draft: typeof updater === "function" ? (updater as (prev: GroupSettings) => GroupSettings)(s.draft) : updater,
    }));
  }

  const hasChanges = JSON.stringify(diffPatch(settings, draft)) !== "{}";

  async function runAction(action: PendingAction) {
    setSaving(true);
    try {
      const dry = await apiFetch<{ impact: SlotReductionImpact[] }>(`/api/groups/${groupCode}`, {
        method: "PATCH",
        token,
        body: { ...action, dryRun: true },
      });
      if (dry.impact.length > 0) {
        setPending({ action, impact: dry.impact });
        return;
      }
      await applyAction(action);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible de mettre à jour les paramètres.");
    } finally {
      setSaving(false);
    }
  }

  async function applyAction(action: PendingAction) {
    setSaving(true);
    try {
      await apiFetch(`/api/groups/${groupCode}`, { method: "PATCH", token, body: { ...action, dryRun: false } });
      showSuccess("Paramètres mis à jour.");
      setPending(null);
      onRefresh();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible de mettre à jour les paramètres.");
    } finally {
      setSaving(false);
    }
  }

  function handleSave() {
    const patch = diffPatch(settings, draft);
    if (Object.keys(patch).length === 0) return;
    runAction({ action: "update_settings", patch });
  }

  function handleResetDefaults() {
    runAction({ action: "reset_defaults" });
  }

  function toggleAllowedType(type: SpotifyItemType) {
    setDraft((d) => {
      const isSelected = d.allowed_types.includes(type);
      if (isSelected && d.allowed_types.length === 1) return d; // au moins un type requis
      const next = isSelected ? d.allowed_types.filter((t) => t !== type) : [...d.allowed_types, type];
      return { ...d, allowed_types: next };
    });
  }

  function removeEmoji(emoji: string) {
    setDraft((d) => {
      if (d.reaction_emojis.length <= SETTINGS_BOUNDS.reaction_emojis.min) return d;
      return { ...d, reaction_emojis: d.reaction_emojis.filter((e) => e !== emoji) };
    });
  }

  function addEmoji(emoji: string) {
    setDraft((d) => {
      if (d.reaction_emojis.includes(emoji)) return d;
      if (d.reaction_emojis.length >= SETTINGS_BOUNDS.reaction_emojis.max) return d;
      return { ...d, reaction_emojis: [...d.reaction_emojis, emoji] };
    });
  }

  function removeGenre(genre: string) {
    setDraft((d) => ({ ...d, genre_tags: d.genre_tags.filter((g) => g !== genre) }));
  }

  function addGenre() {
    const genre = newGenre.trim();
    if (!genre) return;
    setDraft((d) => {
      if (d.genre_tags.some((g) => g.toLowerCase() === genre.toLowerCase())) return d;
      if (d.genre_tags.length >= SETTINGS_BOUNDS.genre_tags.max) return d;
      return { ...d, genre_tags: [...d.genre_tags, genre] };
    });
    setNewGenre("");
  }

  return (
    <section className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">Paramètres du groupe</h2>
        <Button variant="ghost" size="sm" onClick={handleResetDefaults} disabled={saving}>
          Réinitialiser aux défauts
        </Button>
      </div>

      <SettingRow
        label="Slots par membre"
        description={`Nombre de partages actifs par personne (défaut ${DEFAULT_SETTINGS.slots_per_member}).`}
      >
        <Stepper
          value={draft.slots_per_member}
          min={SETTINGS_BOUNDS.slots_per_member.min}
          max={SETTINGS_BOUNDS.slots_per_member.max}
          onChange={(v) => setDraft((d) => ({ ...d, slots_per_member: v }))}
          disabled={saving}
        />
      </SettingRow>

      <SettingRow
        label="Membres maximum"
        description={`Nombre maximum de membres dans le groupe (défaut ${DEFAULT_SETTINGS.max_members}).`}
      >
        <Stepper
          value={draft.max_members}
          min={SETTINGS_BOUNDS.max_members.min}
          max={SETTINGS_BOUNDS.max_members.max}
          onChange={(v) => setDraft((d) => ({ ...d, max_members: v }))}
          disabled={saving}
        />
      </SettingRow>

      <SettingRow
        label="Durée du badge « Nouveau »"
        description={`En jours, 0 pour désactiver (défaut ${DEFAULT_SETTINGS.new_badge_days}).`}
      >
        <Stepper
          value={draft.new_badge_days}
          min={SETTINGS_BOUNDS.new_badge_days.min}
          max={SETTINGS_BOUNDS.new_badge_days.max}
          onChange={(v) => setDraft((d) => ({ ...d, new_badge_days: v }))}
          disabled={saving}
        />
      </SettingRow>

      <SettingRow
        label="Longueur max des notes"
        description={`0 pour désactiver les notes (défaut ${DEFAULT_SETTINGS.note_max_length}).`}
      >
        <Stepper
          value={draft.note_max_length}
          min={SETTINGS_BOUNDS.note_max_length.min}
          max={SETTINGS_BOUNDS.note_max_length.max}
          step={10}
          onChange={(v) => setDraft((d) => ({ ...d, note_max_length: v }))}
          disabled={saving}
        />
      </SettingRow>

      <SettingRow label="Réactions disponibles" description="Emojis que les membres peuvent utiliser pour réagir.">
        <div className="flex flex-col gap-3 items-end">
          <div className="flex flex-wrap gap-2 justify-end">
            {draft.reaction_emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => removeEmoji(emoji)}
                disabled={saving}
                className="flex items-center gap-1 bg-accent/20 border border-accent text-sm px-2.5 py-1 rounded-full cursor-pointer hover:bg-accent/30 transition disabled:opacity-40"
              >
                {emoji} <span className="text-xs text-muted">✕</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {CANDIDATE_REACTION_EMOJIS.filter((e) => !draft.reaction_emojis.includes(e)).map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => addEmoji(emoji)}
                disabled={saving || draft.reaction_emojis.length >= SETTINGS_BOUNDS.reaction_emojis.max}
                className="bg-surface-2 border border-border text-sm px-2.5 py-1 rounded-full cursor-pointer hover:bg-surface-2/70 transition disabled:opacity-30"
              >
                + {emoji}
              </button>
            ))}
          </div>
        </div>
      </SettingRow>

      <SettingRow label="Types de contenus autorisés" description="Au moins un type doit rester sélectionné.">
        <div className="flex gap-2">
          {ALL_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleAllowedType(type)}
              disabled={saving}
              className={`px-3 py-1.5 rounded-full text-sm border transition cursor-pointer disabled:opacity-40 ${
                draft.allowed_types.includes(type)
                  ? "bg-accent/20 border-accent text-foreground"
                  : "bg-surface-2 border-border text-muted"
              }`}
            >
              {spotifyTypeLabelFr(type)}
            </button>
          ))}
        </div>
      </SettingRow>

      <SettingRow
        label="Genres musicaux"
        description="Tags disponibles en partageant. Vide = désactivés pour ce groupe."
      >
        <div className="flex flex-col gap-3 items-end w-full sm:w-auto">
          <div className="flex flex-wrap gap-2 justify-end">
            {draft.genre_tags.map((genre) => (
              <button
                key={genre}
                type="button"
                onClick={() => removeGenre(genre)}
                disabled={saving}
                className="flex items-center gap-1 bg-accent/20 border border-accent text-sm px-2.5 py-1 rounded-full cursor-pointer hover:bg-accent/30 transition disabled:opacity-40"
              >
                {genre} <span className="text-xs text-muted">✕</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2 w-full sm:w-64">
            <Input
              value={newGenre}
              onChange={(e) => setNewGenre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addGenre();
                }
              }}
              placeholder="Ajouter un genre"
              maxLength={30}
              disabled={saving || draft.genre_tags.length >= SETTINGS_BOUNDS.genre_tags.max}
              className="py-1.5 text-sm"
            />
            <Button
              size="sm"
              onClick={addGenre}
              disabled={saving || !newGenre.trim() || draft.genre_tags.length >= SETTINGS_BOUNDS.genre_tags.max}
            >
              Ajouter
            </Button>
          </div>
        </div>
      </SettingRow>

      <SettingRow label="Tri par défaut" description="Tri utilisé par défaut sur le mur du groupe.">
        <div className="inline-flex bg-surface-2 rounded-full p-1 text-sm">
          {(["member", "date"] as SortMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setDraft((d) => ({ ...d, default_sort: mode }))}
              className={`px-3 py-1.5 rounded-full transition cursor-pointer ${
                draft.default_sort === mode ? "bg-accent text-white" : "text-muted"
              }`}
            >
              {mode === "member" ? "Par membre" : "Par date"}
            </button>
          ))}
        </div>
      </SettingRow>

      <SettingRow label="Archives visibles" description="Les autres membres peuvent voir l'archive de chacun.">
        <Toggle checked={draft.archives_visible} onChange={(v) => setDraft((d) => ({ ...d, archives_visible: v }))} disabled={saving} />
      </SettingRow>

      <SettingRow label="Mettre en avant le top pick" description="Le slot #1 est visuellement mis en évidence.">
        <Toggle
          checked={draft.highlight_top_pick}
          onChange={(v) => setDraft((d) => ({ ...d, highlight_top_pick: v }))}
          disabled={saving}
        />
      </SettingRow>

      <div className="sticky bottom-4 flex justify-end">
        <Button size="lg" disabled={!hasChanges || saving} onClick={handleSave}>
          {saving ? "Enregistrement..." : "Enregistrer les modifications"}
        </Button>
      </div>

      {pending && (
        <Modal onClose={() => setPending(null)} fullscreenOnMobile={false}>
          <div className="p-6 flex flex-col gap-4">
            <h3 className="font-display text-xl">Confirmer cette modification ?</h3>
            <p className="text-sm text-muted">
              Réduire le nombre de slots va archiver automatiquement des partages chez :
            </p>
            <ul className="flex flex-col gap-1 text-sm">
              {pending.impact.map((i) => (
                <li key={i.memberId} className="flex justify-between bg-surface-2 rounded-lg px-3 py-2">
                  <span>{i.pseudo}</span>
                  <span className="text-muted">
                    {i.sharesArchived} partage{i.sharesArchived > 1 ? "s" : ""} archivé{i.sharesArchived > 1 ? "s" : ""}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setPending(null)} disabled={saving}>
                Annuler
              </Button>
              <Button variant="danger" onClick={() => applyAction(pending.action)} disabled={saving}>
                {saving ? "..." : "Confirmer et appliquer"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
      <div className="max-w-xs">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}
