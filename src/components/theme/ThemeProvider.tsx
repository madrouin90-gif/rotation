"use client";

import { createContext, useContext, useState } from "react";
import { DEFAULT_THEME, getStoredTheme, storeTheme, type ThemeId } from "@/lib/theme";

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Le script bloquant dans layout.tsx a déjà posé l'attribut data-theme avant l'hydratation ;
  // on lit juste le même localStorage pour que l'état React reflète ce qui est déjà affiché.
  const [theme, setThemeState] = useState<ThemeId>(() =>
    typeof window === "undefined" ? DEFAULT_THEME : getStoredTheme()
  );

  function setTheme(next: ThemeId) {
    setThemeState(next);
    storeTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme doit être utilisé dans un ThemeProvider");
  return ctx;
}
