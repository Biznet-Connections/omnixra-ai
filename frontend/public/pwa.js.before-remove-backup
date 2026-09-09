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
