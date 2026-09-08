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
  // Custom install popup disabled.
  // The PWA remains installable through the browser's native controls.

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
