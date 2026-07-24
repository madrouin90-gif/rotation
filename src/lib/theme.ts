export type ThemeId = "dark" | "light";

export interface ThemeOption {
  id: ThemeId;
  label: string;
  /** [background, surface-2, accent] — pour la pastille d'aperçu dans le sélecteur. */
  swatch: [string, string, string];
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: "dark", label: "Sombre", swatch: ["#0a0a0f", "#1e1e29", "#8b5cf6"] },
  { id: "light", label: "Clair", swatch: ["#f5f5f8", "#ececf1", "#7c3aed"] },
];

export const DEFAULT_THEME: ThemeId = "dark";
const THEME_STORAGE_KEY = "rotation.theme";

function isThemeId(value: string | null): value is ThemeId {
  return THEME_OPTIONS.some((t) => t.id === value);
}

export function getStoredTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeId(stored) ? stored : DEFAULT_THEME;
}

export function storeTheme(theme: ThemeId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}
