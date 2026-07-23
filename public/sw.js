// Service worker de Rotation : installabilité PWA, coquille hors-ligne minimale,
// et réception des notifications push. Ne met JAMAIS en cache les réponses API
// (données trop dynamiques — le polling existant reste la source de vérité).

const SHELL_CACHE = "rotation-shell-v1";
const SHELL_ASSETS = ["/", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Fallback hors-ligne uniquement pour la page d'accueil — tout le reste (API, pages
// dynamiques du groupe) passe directement au réseau, sans interception.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.pathname !== "/") return;

  event.respondWith(fetch(event.request).catch(() => caches.match("/")));
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const { title, body, url } = payload;

  event.waitUntil(
    self.registration.showNotification(title || "Rotation", {
      body: body || "",
      icon: "/icon.svg",
      data: { url: url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url === targetUrl && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
