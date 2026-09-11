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

// Unregister old service workers, then register new one in production
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister());
  }).then(() => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
        .then(reg => {
          console.log("🔥 SW registered:", reg.scope);
          reg.update();
        })
        .catch(err => console.error("SW registration failed:", err));
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
