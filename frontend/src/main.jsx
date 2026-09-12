import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";
import "./utils/terminalLog";
import { setupNativeUX } from "./utils/native";

console.log("🔥 main.jsx loaded");

// Setup native app behavior (status bar, splash, keyboard, back button)
setupNativeUX();

// Detect Capacitor native platform
const isNative =
  typeof window !== "undefined" &&
  (window.Capacitor?.isNativePlatform?.() ||
    window.location.protocol === "capacitor:" ||
    window.location.protocol === "file:");

// ALWAYS unregister any existing service workers inside the native app
// AND on web in dev — prevents stale SW from intercepting API calls.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    return Promise.all(registrations.map((reg) => reg.unregister()));
  }).then((results) => {
    console.log("🔥 Unregistered SWs:", results.length);
  });

  // Only register SW on the WEB (production browser), never in the native app.
  if (!isNative && import.meta.env.PROD) {
    // Small delay to ensure unregister completes first
    setTimeout(() => {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
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
    <App />
  </AuthProvider>
);
