import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

console.log("🔥 main.jsx loaded");

// Unregister old service workers, then register new one in production
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister());
  }).then(() => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log("🔥 SW registered:", reg.scope))
        .catch(err => console.error("SW registration failed:", err));
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
