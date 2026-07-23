import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, mergeSettings, validateSettingsPatch } from "@/lib/settings";

describe("mergeSettings", () => {
  it("retourne les défauts quand stored est null/undefined", () => {
    expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it("fusionne un patch partiel par-dessus les défauts", () => {
    const merged = mergeSettings({ slots_per_member: 8 });
    expect(merged.slots_per_member).toBe(8);
    expect(merged.max_members).toBe(DEFAULT_SETTINGS.max_members);
  });
});

describe("validateSettingsPatch", () => {
  it("accepte un patch valide", () => {
    const result = validateSettingsPatch(DEFAULT_SETTINGS, { slots_per_member: 7 });
    expect(result.ok).toBe(true);
    expect(result.merged?.slots_per_member).toBe(7);
  });

  it("rejette slots_per_member hors bornes", () => {
    const tooLow = validateSettingsPatch(DEFAULT_SETTINGS, { slots_per_member: 0 });
    const tooHigh = validateSettingsPatch(DEFAULT_SETTINGS, { slots_per_member: 11 });
    expect(tooLow.ok).toBe(false);
    expect(tooHigh.ok).toBe(false);
  });

  it("rejette slots_per_member non entier", () => {
    const result = validateSettingsPatch(DEFAULT_SETTINGS, { slots_per_member: 3.5 });
    expect(result.ok).toBe(false);
  });

  it("rejette max_members hors bornes", () => {
    const result = validateSettingsPatch(DEFAULT_SETTINGS, { max_members: 1 });
    expect(result.ok).toBe(false);
  });

  it("rejette les emojis de réaction en double", () => {
    const result = validateSettingsPatch(DEFAULT_SETTINGS, { reaction_emojis: ["🔥", "🔥"] });
    expect(result.ok).toBe(false);
  });

  it("rejette un set de réactions vide ou trop grand", () => {
    expect(validateSettingsPatch(DEFAULT_SETTINGS, { reaction_emojis: [] }).ok).toBe(false);
    expect(
      validateSettingsPatch(DEFAULT_SETTINGS, { reaction_emojis: ["1", "2", "3", "4", "5", "6", "7", "8", "9"] }).ok
    ).toBe(false);
  });

  it("rejette default_sort invalide", () => {
    // @ts-expect-error valeur volontairement invalide pour le test
    const result = validateSettingsPatch(DEFAULT_SETTINGS, { default_sort: "invalid" });
    expect(result.ok).toBe(false);
  });

  it("rejette allowed_types vide", () => {
    const result = validateSettingsPatch(DEFAULT_SETTINGS, { allowed_types: [] });
    expect(result.ok).toBe(false);
  });

  it("rejette les genres en double (insensible à la casse)", () => {
    const result = validateSettingsPatch(DEFAULT_SETTINGS, { genre_tags: ["Rock", "rock"] });
    expect(result.ok).toBe(false);
  });

  it("rejette un genre vide", () => {
    const result = validateSettingsPatch(DEFAULT_SETTINGS, { genre_tags: ["Rock", "  "] });
    expect(result.ok).toBe(false);
  });

  it("accepte des booléens valides pour archives_visible/highlight_top_pick/is_public/require_approval", () => {
    const result = validateSettingsPatch(DEFAULT_SETTINGS, {
      archives_visible: false,
      highlight_top_pick: false,
      is_public: true,
      require_approval: true,
    });
    expect(result.ok).toBe(true);
  });
});
