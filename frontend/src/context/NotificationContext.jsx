import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import api from "../api/axios";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);
const STORAGE_KEY = "omnixra_push_token";

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("omnixra_token"));

  // Keep authToken in sync with localStorage
  useEffect(() => {
    const update = () => setAuthToken(localStorage.getItem("omnixra_token"));
    window.addEventListener("storage", update);
    const t = setInterval(update, 2000);
    return () => { window.removeEventListener("storage", update); clearInterval(t); };
  }, []);
  const [permission, setPermission] = useState("prompt");
  const [deviceToken, setDeviceToken] = useState(() => localStorage.getItem(STORAGE_KEY) || null);
  const [enabled, setEnabled] = useState(false);
  const listenersAttachedRef = useRef(false);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!isNative) return;
    if (listenersAttachedRef.current) return;
    listenersAttachedRef.current = true;
    console.log("[PUSH] Attaching listeners (native)");

    PushNotifications.addListener("registration", async (tokenData) => {
      console.log("[PUSH] FCM token received:", tokenData.value ? tokenData.value.slice(0, 30) + "..." : "none");
      if (!tokenData.value) return;
      setDeviceToken(tokenData.value);
      localStorage.setItem(STORAGE_KEY, tokenData.value);

      // Retry on auth: keep trying until the JWT is available
      let attempt = 0;
      const maxAttempts = 6;
      const tryRegister = async () => {
        attempt++;
        try {
          const jwt = localStorage.getItem("omnixra_token");
          if (!jwt) throw new Error("no_jwt_yet");
          await api.post("/notifications/register-token", {
            token: tokenData.value,
            platform: Capacitor.getPlatform(),
          });
          console.log("[PUSH] Token registered with backend (attempt " + attempt + ")");
          return true;
        } catch (e) {
          const msg = e.response?.data?.message || e.message;
          if (attempt < maxAttempts) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
            console.log("[PUSH] register retry in " + delay + "ms (" + msg + ")");
            await new Promise((r) => setTimeout(r, delay));
            return tryRegister();
          } else {
            console.warn("[PUSH] Token register gave up after " + maxAttempts + " attempts:", msg);
            return false;
          }
        }
      };
      tryRegister();
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.warn("[PUSH] Registration error:", err);
    });

    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("[PUSH] Foreground notification:", notification);
      window.dispatchEvent(new CustomEvent("push-foreground", { detail: notification }));
    });

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("[PUSH] Notification tapped:", action.notification?.data);
      const data = action.notification?.data || {};
      try {
        // Prefer explicit deepLink (set by createNotification)
        if (data.deepLink) {
          window.dispatchEvent(new CustomEvent("push-navigate", { detail: { deepLink: data.deepLink, data } }));
          return;
        }
        // Legacy fallback
        if (data.postId) {
          window.dispatchEvent(new CustomEvent("push-navigate", {
            detail: { page: "home", postId: data.postId, commentId: data.commentId || null },
          }));
        } else if (data.chatId || data.conversationId) {
          window.dispatchEvent(new CustomEvent("push-navigate", {
            detail: { page: "inbox", chatId: data.chatId || data.conversationId },
          }));
        } else {
          window.dispatchEvent(new CustomEvent("push-navigate", { detail: { page: "home" } }));
        }
      } catch (e) {
        console.warn("[PUSH] Navigation error:", e.message);
      }
    });
  }, [isNative]);

  useEffect(() => {
    if (!isNative) return;
    if (!user || !authToken) return;

    (async () => {
      try {
        console.log("[PUSH] Checking permission state...");
        const perm = await PushNotifications.checkPermissions();
        console.log("[PUSH] checkPermissions result:", perm);

        let granted = perm && perm.receive === "granted";
        setPermission((perm && perm.receive) || "prompt");
        setEnabled(granted);

        if (!granted) {
          console.log("[PUSH] Requesting permission...");
          const req = await PushNotifications.requestPermissions();
          console.log("[PUSH] requestPermissions result:", req);
          granted = req && req.receive === "granted";
          setPermission((req && req.receive) || "denied");
          setEnabled(granted);
        }

        if (granted) {
          console.log("[PUSH] Registering with FCM...");
          await PushNotifications.register();
        }
      } catch (e) {
        console.warn("[PUSH] Permission flow error:", e.message);
      }
    })();
  }, [isNative, user, authToken]);

  // ── AUTO-REGISTER-ON-LOGIN ──
  // Whenever user logs in (or JWT changes), if we already have a stored FCM token,
  // re-register it with the backend. Handles the case where the FCM token
  // arrived BEFORE the JWT was loaded.
  useEffect(() => {
    if (!isNative) return;
    if (!user || !authToken) return;

    const storedToken = localStorage.getItem(STORAGE_KEY);
    if (!storedToken) return;

    let cancelled = false;
    (async () => {
      try {
        await api.post("/notifications/register-token", {
          token: storedToken,
          platform: Capacitor.getPlatform(),
        });
        if (!cancelled) console.log("[PUSH] Token re-registered after login");
      } catch (e) {
        if (!cancelled) console.warn("[PUSH] Re-register failed:", e.response?.data?.message || e.message);
      }
    })();

    return () => { cancelled = true; };
  }, [isNative, user?._id, authToken]);

  async function requestPermission() {
    if (!isNative) return { granted: false, reason: "not_native" };
    try {
      console.log("[PUSH] Manual requestPermission()");
      const { receive } = await PushNotifications.requestPermissions();
      setPermission(receive || "denied");
      const granted = receive === "granted";
      setEnabled(granted);
      if (granted) {
        await PushNotifications.register();
      }
      return { granted };
    } catch (e) {
      console.warn("[PUSH] requestPermissions failed:", e.message);
      return { granted: false, reason: e.message };
    }
  }

  async function disableNotifications() {
    const t = localStorage.getItem(STORAGE_KEY);
    if (t) {
      try {
        await api.delete("/notifications/unregister-token", { data: { token: t } });
      } catch (e) {
        console.warn("[PUSH] unregister failed:", e.message);
      }
    }
    localStorage.removeItem(STORAGE_KEY);
    setDeviceToken(null);
    setEnabled(false);
  }

  const value = { permission, enabled, deviceToken, requestPermission, disableNotifications };
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}

export default NotificationContext;
