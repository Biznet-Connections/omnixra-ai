#!/data/data/com.termux/files/usr/bin/bash

set -e

ROOT="$HOME/omnixra-ai"
FRONTEND="$ROOT/frontend"

echo ""
echo "=========================================="
echo "        OMNIXRA AI PWA INSTALLER"
echo "=========================================="
echo ""

if [ ! -d "$FRONTEND" ]; then
  echo "ERROR: frontend folder not found."
  exit 1
fi

mkdir -p "$FRONTEND/public/icons"
mkdir -p "$FRONTEND/public"

echo "Creating manifest..."

cat > "$FRONTEND/public/manifest.json" <<'JSON'
{
  "id": "/",
  "name": "Omnixra AI",
  "short_name": "Omnixra",
  "description": "AI-powered employment network",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "display_override": [
    "window-controls-overlay",
    "standalone",
    "minimal-ui"
  ],
  "orientation": "portrait-primary",
  "background_color": "#06070b",
  "theme_color": "#6366f1",
  "lang": "en",
  "categories": [
    "business",
    "productivity",
    "social"
  ],
  "icons": [
    {
      "src": "/icons/icon-192.svg",
      "sizes": "192x192",
      "type": "image/svg+xml",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512.svg",
      "sizes": "512x512",
      "type": "image/svg+xml",
      "purpose": "any"
    },
    {
      "src": "/icons/maskable-512.svg",
      "sizes": "512x512",
      "type": "image/svg+xml",
      "purpose": "maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Omnixra AI",
      "short_name": "AI",
      "url": "/"
    },
    {
      "name": "Jobs",
      "short_name": "Jobs",
      "url": "/jobs"
    }
  ]
}
JSON

echo "Creating Omnixra icons..."

cat > "$FRONTEND/public/icons/icon-192.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#6366f1"/>
<stop offset=".55" stop-color="#7c3aed"/>
<stop offset="1" stop-color="#4f46e5"/>
</linearGradient>
<filter id="s">
<feDropShadow dx="0" dy="8" stdDeviation="8" flood-opacity=".4"/>
</filter>
</defs>
<rect width="192" height="192" rx="44" fill="#06070b"/>
<circle cx="96" cy="96" r="62" fill="url(#g)" filter="url(#s)"/>
<path d="M96 43L104 75L137 84L106 96L96 131L86 96L55 84L88 75Z" fill="white"/>
<circle cx="96" cy="96" r="8" fill="white"/>
</svg>
SVG

cp "$FRONTEND/public/icons/icon-192.svg" \
   "$FRONTEND/public/icons/icon-512.svg"

cp "$FRONTEND/public/icons/icon-192.svg" \
   "$FRONTEND/public/icons/maskable-512.svg"

echo "Creating service worker..."

cat > "$FRONTEND/public/sw.js" <<'SW'
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
SW

echo "Creating PWA controller..."

cat > "$FRONTEND/public/pwa.js" <<'JS'
(() => {
  "use strict";

  /*
   * OMNIXRA AI PWA CONTROLLER
   *
   * This file is intentionally independent
   * from React so we do not modify App.jsx.
   */

  const isProduction =
    location.protocol === "https:" ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";

  if (!isProduction) {
    console.log(
      "[Omnixra PWA] Secure context required."
    );
    return;
  }

  /*
   * SERVICE WORKER
   */
  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      console.log(
        "[Omnixra PWA] Service workers unavailable."
      );
      return null;
    }

    try {
      const registration =
        await navigator.serviceWorker.register(
          "/sw.js",
          {
            scope: "/"
          }
        );

      console.log(
        "[Omnixra PWA] Service worker ready:",
        registration.scope
      );

      return registration;
    } catch (error) {
      console.error(
        "[Omnixra PWA] Service worker failed:",
        error
      );

      return null;
    }
  }

  /*
   * Detect standalone installation.
   */
  function isInstalled() {
    return (
      window.matchMedia(
        "(display-mode: standalone)"
      ).matches ||
      window.navigator.standalone === true
    );
  }

  /*
   * INSTALL EVENT
   */
  let deferredInstallPrompt = null;

  window.addEventListener(
    "beforeinstallprompt",
    event => {

      event.preventDefault();

      deferredInstallPrompt = event;

      console.log(
        "[Omnixra PWA] Installation available."
      );

      /*
       * Give the actual application time
       * to load first.
       *
       * We DO NOT force a browser popup.
       */
      setTimeout(() => {

        if (!isInstalled()) {
          createInstallUI();
        }

      }, 2500);
    }
  );

  /*
   * APP INSTALLED
   */
  window.addEventListener(
    "appinstalled",
    () => {

      deferredInstallPrompt = null;

      removeInstallUI();

      console.log(
        "[Omnixra PWA] Omnixra installed."
      );
    }
  );

  /*
   * INSTALL UI
   */
  function createInstallUI() {

    if (
      document.getElementById(
        "omnixra-install-card"
      )
    ) {
      return;
    }

    if (!deferredInstallPrompt) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "omnixra-install-style";

    style.textContent = `
      #omnixra-install-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding: 16px;
        background: rgba(0,0,0,.48);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        animation: omnixraFade .2s ease;
      }

      #omnixra-install-card {
        width: 100%;
        max-width: 440px;
        box-sizing: border-box;
        padding: 22px;
        border-radius: 26px;
        background: #10111a;
        color: white;
        border: 1px solid rgba(139,92,246,.28);
        box-shadow:
          0 24px 80px rgba(0,0,0,.6);
        font-family:
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
        animation:
          omnixraSlide .3s ease;
      }

      #omnixra-install-head {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      #omnixra-install-icon {
        width: 58px;
        height: 58px;
        border-radius: 18px;
        background:
          linear-gradient(
            135deg,
            #6366f1,
            #7c3aed
          );
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-size: 29px;
      }

      #omnixra-install-title {
        font-size: 20px;
        font-weight: 800;
      }

      #omnixra-install-subtitle {
        margin-top: 3px;
        color: #a1a1aa;
        font-size: 13px;
      }

      #omnixra-install-description {
        color: #a1a1aa;
        font-size: 14px;
        line-height: 1.55;
        margin: 18px 0 20px;
      }

      #omnixra-install-actions {
        display: flex;
        gap: 10px;
      }

      .omnixra-install-button {
        flex: 1;
        border: 0;
        border-radius: 14px;
        padding: 13px 16px;
        font-size: 14px;
        font-weight: 800;
        cursor: pointer;
      }

      #omnixra-install-now {
        color: white;
        background:
          linear-gradient(
            135deg,
            #6366f1,
            #7c3aed
          );
      }

      #omnixra-install-later {
        color: #d4d4d8;
        background: #18181b;
        border: 1px solid #27272a;
      }

      @keyframes omnixraFade {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes omnixraSlide {
        from {
          transform: translateY(30px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `;

    document.head.appendChild(style);

    const overlay =
      document.createElement("div");

    overlay.id =
      "omnixra-install-overlay";

    const card =
      document.createElement("div");

    card.id =
      "omnixra-install-card";

    card.innerHTML = `
      <div id="omnixra-install-head">

        <div id="omnixra-install-icon">
          ✦
        </div>

        <div>
          <div id="omnixra-install-title">
            Install Omnixra AI
          </div>

          <div id="omnixra-install-subtitle">
            Your AI-powered employment network
          </div>
        </div>

      </div>

      <div id="omnixra-install-description">
        Install Omnixra on your phone for
        faster access to jobs, AI, messages
        and notifications.
      </div>

      <div id="omnixra-install-actions">

        <button
          id="omnixra-install-now"
          class="omnixra-install-button"
          type="button"
        >
          Install App
        </button>

        <button
          id="omnixra-install-later"
          class="omnixra-install-button"
          type="button"
        >
          Later
        </button>

      </div>
    `;

    overlay.appendChild(card);

    document.body.appendChild(overlay);

    overlay.addEventListener(
      "click",
      event => {

        if (
          event.target === overlay
        ) {
          removeInstallUI();
        }
      }
    );

    document
      .getElementById(
        "omnixra-install-later"
      )
      ?.addEventListener(
        "click",
        removeInstallUI
      );

    document
      .getElementById(
        "omnixra-install-now"
      )
      ?.addEventListener(
        "click",
        installApplication
      );
  }

  /*
   * REAL BROWSER INSTALL
   */
  async function installApplication() {

    if (!deferredInstallPrompt) {
      removeInstallUI();
      return;
    }

    try {

      deferredInstallPrompt.prompt();

      const result =
        await deferredInstallPrompt.userChoice;

      console.log(
        "[Omnixra PWA] Install result:",
        result?.outcome
      );

      deferredInstallPrompt = null;

      removeInstallUI();

    } catch (error) {

      console.error(
        "[Omnixra PWA] Install error:",
        error
      );

      removeInstallUI();
    }
  }

  function removeInstallUI() {

    document
      .getElementById(
        "omnixra-install-overlay"
      )
      ?.remove();

    document
      .getElementById(
        "omnixra-install-style"
      )
      ?.remove();
  }

  /*
   * NETWORK STATUS
   */
  function setupNetworkEvents() {

    window.addEventListener(
      "online",
      () => {
        console.log(
          "[Omnixra] Back online."
        );
      }
    );

    window.addEventListener(
      "offline",
      () => {
        console.log(
          "[Omnixra] Offline mode."
        );
      }
    );
  }

  /*
   * START
   *
   * Wait until the existing application
   * has loaded before doing anything.
   */
  window.addEventListener(
    "load",
    async () => {

      setupNetworkEvents();

      await registerServiceWorker();

    },
    {
      once: true
    }
  );

})();
JS

echo "Updating index.html..."

INDEX="$FRONTEND/index.html"

if [ ! -f "$INDEX" ]; then
  echo "ERROR: frontend/index.html not found."
  exit 1
fi

cp "$INDEX" "$INDEX.omnixra-backup"

python - "$INDEX" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()

manifest = '<link rel="manifest" href="/manifest.json">'

if manifest not in text:
    if "</head>" in text:
        text = text.replace(
            "</head>",
            """    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#6366f1">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Omnixra AI">
</head>""",
            1
        )

script = '<script src="/pwa.js" defer></script>'

if script not in text:
    if "</body>" in text:
        text = text.replace(
            "</body>",
            f"    {script}\n</body>",
            1
        )
    else:
        text += "\n" + script + "\n"

path.write_text(text)
PY

echo ""
echo "=========================================="
echo "      OMNIXRA PWA INSTALLATION DONE"
echo "=========================================="
echo ""

echo "Files created:"
echo ""
echo "frontend/public/manifest.json"
echo "frontend/public/sw.js"
echo "frontend/public/pwa.js"
echo "frontend/public/icons/icon-192.svg"
echo "frontend/public/icons/icon-512.svg"
echo "frontend/public/icons/maskable-512.svg"
echo ""

echo "Backup created:"
echo ""
echo "frontend/index.html.omnixra-backup"
echo ""

echo "Building frontend..."
cd "$FRONTEND"

npm run build

echo ""
echo "=========================================="
echo "             BUILD SUCCESS"
echo "=========================================="
echo ""
echo "Omnixra PWA layer is installed."
echo ""
echo "IMPORTANT:"
echo "Push notifications require the backend"
echo "VAPID/subscription integration."
echo ""
echo "The existing React application was NOT"
echo "replaced."
echo ""
