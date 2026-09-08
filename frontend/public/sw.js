const VERSION = "omnixra-pwa-v1";
const CACHE = VERSION;

const SHELL = [
  "/",
  "/manifest.json",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
  "/icons/maskable-512.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key =>
              key.startsWith("omnixra-pwa-") &&
              key !== CACHE
            )
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  /*
   * NEVER cache API responses.
   * This protects authenticated/private Omnixra data.
   */
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/socket.io/")
  ) {
    return;
  }

  /*
   * HTML navigation:
   * Online = normal application.
   * Offline = cached Omnixra shell.
   */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => response)
        .catch(() => caches.match("/"))
    );

    return;
  }

  /*
   * Static resources.
   */
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();

          caches.open(CACHE)
            .then(cache => cache.put(request, copy));
        }

        return response;
      })
      .catch(() => caches.match(request))
  );
});

/*
 * PUSH NOTIFICATIONS
 */
self.addEventListener("push", event => {
  let data = {};

  try {
    data = event.data
      ? event.data.json()
      : {};
  } catch {
    data = {
      title: "Omnixra AI",
      body: event.data
        ? event.data.text()
        : "You have a new notification."
    };
  }

  const title =
    data.title || "Omnixra AI";

  const options = {
    body:
      data.body ||
      "You have a new notification.",

    icon:
      data.icon ||
      "/icons/icon-192.svg",

    badge:
      data.badge ||
      "/icons/icon-192.svg",

    tag:
      data.tag ||
      "omnixra-notification",

    renotify: true,

    vibrate: [200, 100, 200],

    data: {
      url:
        data.url ||
        "/",

      type:
        data.type ||
        "general"
    }
  };

  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  );
});

/*
 * NOTIFICATION CLICK
 */
self.addEventListener(
  "notificationclick",
  event => {
    event.notification.close();

    const target =
      event.notification?.data?.url ||
      "/";

    event.waitUntil(
      clients.matchAll({
        type: "window",
        includeUncontrolled: true
      })
      .then(clientList => {

        for (const client of clientList) {
          if ("focus" in client) {

            if ("navigate" in client) {
              client.navigate(target);
            }

            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(target);
        }

      })
    );
  }
);
