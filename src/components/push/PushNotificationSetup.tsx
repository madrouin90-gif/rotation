"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { requestPushPermissionAndSubscribe } from "@/lib/pushClient";

interface PushNotificationSetupProps {
  token: string;
}

type PushState = "unsupported" | "loading" | "denied" | "subscribed" | "unsubscribed";

export function PushNotificationSetup({ token }: PushNotificationSetupProps) {
  const { showError, showSuccess } = useToast();
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Lecture de capacités externes (navigateur/permission) au montage — pas de valeur
    // dérivée d'un prop/state, même pattern que la lecture localStorage de la page d'accueil.
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready.then(async (registration) => {
      const sub = await registration.pushManager.getSubscription();
      setState(sub ? "subscribed" : "unsubscribed");

      // Re-synchronise silencieusement l'abonnement auprès du serveur à chaque ouverture :
      // iOS peut invalider un abonnement push côté serveur (notre nettoyage automatique sur
      // échec d'envoi, ou expiration silencieuse) sans que le navigateur en soit informé —
      // tant que l'abonnement du navigateur est encore valide, ça évite d'avoir à désactiver/
      // réactiver manuellement pour le retrouver.
      if (sub) {
        const json = sub.toJSON();
        apiFetch("/api/account/push/subscribe", {
          method: "POST",
          token,
          body: { endpoint: json.endpoint, keys: json.keys },
        }).catch(() => {
          // Best-effort — pas de toast pour ne pas déranger au chargement.
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleEnable() {
    setBusy(true);
    try {
      const result = await requestPushPermissionAndSubscribe(token);
      if (result === "denied") {
        setState("denied");
        return;
      }
      setState("subscribed");
      showSuccess("Notifications activées.");
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible d'activer les notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await apiFetch("/api/account/push/unsubscribe", { method: "POST", token, body: { endpoint } });
      }
      setState("unsubscribed");
      showSuccess("Notifications désactivées.");
    } catch (e) {
      showError(e instanceof ApiError ? e.message : "Impossible de désactiver les notifications.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "unsupported") {
    return <p className="text-xs text-muted">Les notifications ne sont pas supportées par ce navigateur.</p>;
  }

  if (state === "loading") return null;

  if (state === "denied") {
    return (
      <p className="text-xs text-muted">
        Notifications bloquées — autorise-les dans les réglages de ton navigateur pour ce site si tu changes d&apos;avis.
      </p>
    );
  }

  if (state === "subscribed") {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted">Notifications activées ✓</p>
        <button
          type="button"
          onClick={handleDisable}
          disabled={busy}
          className="text-xs text-muted hover:text-accent transition cursor-pointer text-left w-fit disabled:opacity-50"
        >
          {busy ? "..." : "Désactiver les notifications"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-muted">Reçois une notification pour l&apos;activité de tes groupes.</p>
      <Button size="sm" variant="secondary" onClick={handleEnable} disabled={busy} className="w-fit">
        {busy ? "..." : "Activer les notifications"}
      </Button>
    </div>
  );
}
