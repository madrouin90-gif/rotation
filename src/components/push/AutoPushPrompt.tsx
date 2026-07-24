"use client";

import { useEffect, useState } from "react";
import { requestPushPermissionAndSubscribe } from "@/lib/pushClient";

const PROMPTED_KEY = "rotation.pushPromptShown";

interface AutoPushPromptProps {
  token: string;
}

function isStandalone(): boolean {
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone === true;
}

/**
 * Propose l'activation des notifications automatiquement, une seule fois, la première
 * fois que l'app est ouverte en mode installé (écran d'accueil) — plutôt que d'attendre
 * que le membre aille la chercher dans son profil. Ne contourne jamais la permission
 * native du navigateur (impossible et non souhaitable) : ne fait qu'avancer le moment où
 * on la demande.
 */
export function AutoPushPrompt({ token }: AutoPushPromptProps) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(PROMPTED_KEY)) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    if (!isStandalone()) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
  }, []);

  function dismiss() {
    window.localStorage.setItem(PROMPTED_KEY, "1");
    setVisible(false);
  }

  async function handleEnable() {
    setBusy(true);
    try {
      await requestPushPermissionAndSubscribe(token);
    } catch {
      // Best-effort — la bannière disparaît, le membre pourra toujours réessayer depuis
      // son profil si quelque chose a échoué techniquement.
    } finally {
      window.localStorage.setItem(PROMPTED_KEY, "1");
      setBusy(false);
      setVisible(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4">
      <div className="flex items-center justify-between gap-3 bg-accent/15 border border-accent/30 rounded-xl px-4 py-2.5 text-sm">
        <span>🔔 Active les notifications pour être averti de l&apos;activité de tes groupes ?</span>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleEnable}
            disabled={busy}
            className="text-accent font-medium hover:underline cursor-pointer disabled:opacity-50"
          >
            {busy ? "..." : "Activer"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="text-muted hover:text-foreground transition cursor-pointer"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
