"use client";

import { useEffect } from "react";

/** Enregistre le service worker au montage — installabilité PWA + coquille hors-ligne.
 * Ne demande aucune permission (le push est activé séparément, sur geste utilisateur,
 * voir PushNotificationSetup.tsx). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Service worker registration failed", err);
    });
  }, []);

  return null;
}
