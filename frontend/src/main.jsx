import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";
import "./utils/terminalLog";
import { setupNativeUX } from "./utils/native";
import { NotificationProvider } from "./context/NotificationContext";

console.log("🔥 main.jsx loaded");

// Setup native app behavior (status bar, splash, keyboard, back button)
setupNativeUX();

// Detect Capacitor native platform
const isNative =
  typeof window !== "undefined" &&
  (window.Capacitor?.isNativePlatform?.() ||
    window.location.protocol === "capacitor:" ||
    window.location.protocol === "file:");

// Tag the body so CSS can target native vs browser
if (typeof document !== "undefined") {
  document.body.classList.toggle("is-native", isNative);
}

// ── Native OAuth deep link handler ──
// When the app is opened via omnixraapp://oauth?token=... (from Google),
// forward the token into the app.
if (isNative) {
  (async () => {
    try {
      const { App: CapApp } = await import("@capacitor/app");
      const { Browser } = await import("@capacitor/browser");

      CapApp.addListener("appUrlOpen", async (event) => {
        console.log("🔗 appUrlOpen:", event.url);
        if (!event.url.startsWith("omnixraapp://oauth")) return;

        try { await Browser.close(); } catch (e) { }

        const query = event.url.split("?")[1] || "";
        const params = new URLSearchParams(query);
        const token = params.get("token");
        const userId = params.get("userId");
        const error = params.get("error");

        if (error) {
          console.warn("OAuth error:", error);
          window.dispatchEvent(new CustomEvent("oauth-error", { detail: { error } }));
          return;
        }

        if (token && token.length > 20) {
          console.log("🔗 Got OAuth token, storing...");
          localStorage.setItem("omnixra_token", token);
          if (userId) localStorage.setItem("omnixra_userId", userId);
          window.dispatchEvent(new CustomEvent("oauth-token-received", { detail: { token, userId } }));
        }
      });

      // Also handle the initial launch (cold start via deep link)
      const launchUrl = await CapApp.getLaunchUrl();
      if (launchUrl?.url?.startsWith("omnixraapp://oauth")) {
        const query = launchUrl.url.split("?")[1] || "";
        const params = new URLSearchParams(query);
        const token = params.get("token");
        if (token) {
          localStorage.setItem("omnixra_token", token);
        }
      }
    } catch (e) {
      console.warn("Deep link setup error:", e.message);
    }
  })();
}

// ALWAYS unregister any existing service workers inside the native app
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    return Promise.all(registrations.map((reg) => reg.unregister()));
  }).then((results) => {
    console.log("🔥 Unregistered SWs:", results.length);
  });

  if (!isNative && import.meta.env.PROD) {
    setTimeout(() => {
      navigator.serviceWorker
        .register("/sw.js?v=3", { updateViaCache: "none" })
        .then((reg) => {
          console.log("🔥 SW registered:", reg.scope);
          reg.update();
        })
        .catch((err) => console.error("SW registration failed:", err));
    }, 500);
  } else {
    console.log("🔥 SW disabled (native app or dev mode)");
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <NotificationProvider>
        <App />
      </NotificationProvider>
  </AuthProvider>
);
