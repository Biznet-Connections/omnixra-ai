import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import api from "../api/axios";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

const STORAGE_KEY = "omnixra_push_token";

export function NotificationProvider({ children }) {
  const { user, token: authToken } = useAuth();
  const [permission, setPermission] = useState("prompt");
  const [deviceToken, setDeviceToken] = useState(() => localStorage.getItem(STORAGE_KEY) || null);
  const [enabled, setEnabled] = useState(false);
  const listenersAttachedRef = useRef(false);
  const pluginRef = useRef(null);

  // Load plugin only on native
  async function loadPlugin() {
    if (pluginRef.current) return pluginRef.current;
    if (!Capacitor.isNativePlatform()) return null;
    try {
      const mod = await import("@capacitor/push-notifications");
      pluginRef.current = mod.PushNotifications;
      return pluginRef.current;
    } catch (e) {
      console.warn("Push plugin not available:", e.message);
      return null;
    }
  }

  // Check permission state on mount
  useEffect(() => {
    (async () => {
      const plugin = await loadPlugin();
      if (!plugin) return;
      try {
        const { receive } = await plugin.checkPermissions();
        setPermission(receive || "prompt");
        setEnabled(receive === "granted");
      } catch (e) {
        console.warn("checkPermissions failed:", e.message);
      }
    })();
  }, []);

  // When user is logged in and permission granted, register
  useEffect(() => {
    if (!user || !authToken) return;
    (async () => {
      const plugin = await loadPlugin();
      if (!plugin) return;

      // Attach listeners only once
      if (!listenersAttachedRef.current) {
        listenersAttachedRef.current = true;

        plugin.addListener("registration", async (tokenData) => {
          console.log("📱 [PUSH] FCM token received:", tokenData.value?.slice(0, 20) + "...");
          setDeviceToken(tokenData.value);
          localStorage.setItem(STORAGE_KEY, tokenData.value);

          // Register with backend
          try {
            await api.post("/notifications/register-token", {
              token: tokenData.value,
              platform: Capacitor.getPlatform(),
            });
            console.log("✅ [PUSH] Token registered with backend");
          } catch (e) {
            console.warn("Token register failed:", e.response?.data?.message || e.message);
          }
        });

        plugin.addListener("registrationError", (err) => {
          console.warn("📱 [PUSH] Registration error:", err);
        });

        plugin.addListener("pushNotificationReceived", (notification) => {
          console.log("📱 [PUSH] Foreground notification:", notification);
          // Show in-app banner (or just log for now)
          window.dispatchEvent(new CustomEvent("push-foreground", { detail: notification }));
        });

        plugin.addListener("pushNotificationActionPerformed", (action) => {
          console.log("📱 [PUSH] Tapped:", action.notification?.data);
          const data = action.notification?.data || {};
          // Route based on type
          try {
            if (data.postId) {
              window.location.hash = "";
              window.history.pushState({}, "", "/post/" + data.postId);
              window.dispatchEvent(new CustomEvent("push-navigate", { detail: { page: "home", postId: data.postId } }));
            } else if (data.chatId) {
              window.dispatchEvent(new CustomEvent("push-navigate", { detail: { page: "inbox", chatId: data.chatId } }));
            } else {
              window.dispatchEvent(new CustomEvent("push-navigate", { detail: { page: "home" } }));
            }
          } catch (e) {
            console.warn("Push navigation failed:", e.message);
          }
        });
      }

      // If permission already granted, register right now
      if (permission === "granted") {
        try {
          await plugin.register();
        } catch (e) {
          console.warn("register() failed:", e.message);
        }
      }
    })();
  }, [user, authToken, permission]);

  // Request permission (called after signup, or from Settings)
  async function requestPermission() {
    const plugin = await loadPlugin();
    if (!plugin) return { granted: false, reason: "not_native" };

    try {
      const { receive } = await plugin.requestPermissions();
      setPermission(receive || "denied");
      const granted = receive === "granted";
      setEnabled(granted);

      if (granted) {
        await plugin.register();
      }
      return { granted };
    } catch (e) {
      console.warn("requestPermissions failed:", e.message);
      return { granted: false, reason: e.message };
    }
  }

  // Unregister (on toggle off or logout)
  async function disableNotifications() {
    const t = localStorage.getItem(STORAGE_KEY);
    if (t) {
      try {
        await api.delete("/notifications/unregister-token", { data: { token: t } });
      } catch (e) {
        console.warn("unregister failed:", e.message);
      }
    }
    localStorage.removeItem(STORAGE_KEY);
    setDeviceToken(null);
    setEnabled(false);
  }

  const value = {
    permission,
    enabled,
    deviceToken,
    requestPermission,
    disableNotifications,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}

export default NotificationContext;
