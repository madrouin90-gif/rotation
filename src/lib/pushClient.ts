import { apiFetch } from "@/lib/apiClient";

export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * Demande la permission de notification puis s'abonne au push, en enregistrant
 * l'abonnement côté serveur. Ne throw jamais pour un refus (retourne "denied") — throw
 * seulement pour une erreur technique (clé VAPID absente, échec réseau), à catcher par
 * l'appelant. Partagé entre PushNotificationSetup (bouton dans le profil) et
 * AutoPushPrompt (bannière automatique à l'installation).
 */
export async function requestPushPermissionAndSubscribe(token: string): Promise<"granted" | "denied"> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    throw new Error("Les notifications ne sont pas configurées sur ce serveur.");
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
  });

  const json = subscription.toJSON();
  await apiFetch("/api/account/push/subscribe", {
    method: "POST",
    token,
    body: { endpoint: json.endpoint, keys: json.keys },
  });

  return "granted";
}
