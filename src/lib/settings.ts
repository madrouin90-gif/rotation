import type { GroupSettings, SortMode, SpotifyItemType } from "@/types";

export const DEFAULT_SETTINGS: GroupSettings = {
  slots_per_member: 5,
  max_members: 10,
  new_badge_days: 7,
  note_max_length: 140,
  reaction_emojis: ["🔥", "❤️", "🎯", "😭", "🤯"],
  default_sort: "member",
  archives_visible: true,
  highlight_top_pick: true,
  allowed_types: ["track", "album", "artist"],
};

export const SETTINGS_BOUNDS = {
  slots_per_member: { min: 1, max: 10 },
  max_members: { min: 2, max: 25 },
  new_badge_days: { min: 0, max: 90 },
  note_max_length: { min: 0, max: 500 },
  reaction_emojis: { min: 1, max: 8 },
} as const;

const ALL_SPOTIFY_TYPES: SpotifyItemType[] = ["track", "album", "artist"];
const ALL_SORT_MODES: SortMode[] = ["member", "date"];

/** Merge les settings stockés (potentiellement partiels/anciens) avec les défauts. */
export function mergeSettings(stored: Partial<GroupSettings> | null | undefined): GroupSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...(stored ?? {}),
  };
}

export interface SettingsValidationError {
  field: string;
  message: string;
}

export interface SlotReductionImpact {
  memberId: string;
  pseudo: string;
  sharesArchived: number;
}

export interface ValidateSettingsResult {
  ok: boolean;
  errors: SettingsValidationError[];
  merged?: GroupSettings;
}

/** Valide un patch partiel de settings par rapport aux bornes définies. Ne vérifie pas les effets de bord (membres/slots existants) — voir computeSlotReductionImpact / lib/groupSettings pour ça. */
export function validateSettingsPatch(
  current: GroupSettings,
  patch: Partial<GroupSettings>
): ValidateSettingsResult {
  const errors: SettingsValidationError[] = [];
  const merged: GroupSettings = { ...current, ...patch };

  if (patch.slots_per_member !== undefined) {
    const { min, max } = SETTINGS_BOUNDS.slots_per_member;
    if (!Number.isInteger(patch.slots_per_member) || patch.slots_per_member < min || patch.slots_per_member > max) {
      errors.push({
        field: "slots_per_member",
        message: `Le nombre de slots doit être un entier entre ${min} et ${max}.`,
      });
    }
  }

  if (patch.max_members !== undefined) {
    const { min, max } = SETTINGS_BOUNDS.max_members;
    if (!Number.isInteger(patch.max_members) || patch.max_members < min || patch.max_members > max) {
      errors.push({
        field: "max_members",
        message: `Le nombre maximum de membres doit être un entier entre ${min} et ${max}.`,
      });
    }
  }

  if (patch.new_badge_days !== undefined) {
    const { min, max } = SETTINGS_BOUNDS.new_badge_days;
    if (!Number.isInteger(patch.new_badge_days) || patch.new_badge_days < min || patch.new_badge_days > max) {
      errors.push({
        field: "new_badge_days",
        message: `La durée du badge « Nouveau » doit être un entier entre ${min} et ${max} jours.`,
      });
    }
  }

  if (patch.note_max_length !== undefined) {
    const { min, max } = SETTINGS_BOUNDS.note_max_length;
    if (!Number.isInteger(patch.note_max_length) || patch.note_max_length < min || patch.note_max_length > max) {
      errors.push({
        field: "note_max_length",
        message: `La longueur max des notes doit être un entier entre ${min} et ${max}.`,
      });
    }
  }

  if (patch.reaction_emojis !== undefined) {
    const { min, max } = SETTINGS_BOUNDS.reaction_emojis;
    const emojis = patch.reaction_emojis;
    if (!Array.isArray(emojis) || emojis.length < min || emojis.length > max) {
      errors.push({
        field: "reaction_emojis",
        message: `Le set de réactions doit contenir entre ${min} et ${max} emojis.`,
      });
    } else if (new Set(emojis).size !== emojis.length) {
      errors.push({ field: "reaction_emojis", message: "Chaque emoji ne peut apparaître qu'une seule fois." });
    }
  }

  if (patch.default_sort !== undefined && !ALL_SORT_MODES.includes(patch.default_sort)) {
    errors.push({ field: "default_sort", message: "Tri par défaut invalide." });
  }

  if (patch.allowed_types !== undefined) {
    const types = patch.allowed_types;
    if (!Array.isArray(types) || types.length === 0 || !types.every((t) => ALL_SPOTIFY_TYPES.includes(t))) {
      errors.push({
        field: "allowed_types",
        message: "Au moins un type de contenu Spotify doit être autorisé (chanson, album ou artiste).",
      });
    }
  }

  if (patch.archives_visible !== undefined && typeof patch.archives_visible !== "boolean") {
    errors.push({ field: "archives_visible", message: "Valeur invalide pour la visibilité des archives." });
  }

  if (patch.highlight_top_pick !== undefined && typeof patch.highlight_top_pick !== "boolean") {
    errors.push({ field: "highlight_top_pick", message: "Valeur invalide pour la mise en évidence du top pick." });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, errors: [], merged };
}
