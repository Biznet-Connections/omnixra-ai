import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
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
      try {
        await api.post("/notifications/register-token", {
          token: tokenData.value,
          platform: Capacitor.getPlatform(),
        });
        console.log("[PUSH] Token registered with backend");
      } catch (e) {
        console.warn("[PUSH] Token register failed:", e.response?.data?.message || e.message);
      }
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
        if (data.postId) {
          window.dispatchEvent(new CustomEvent("push-navigate", { detail: { page: "home", postId: data.postId } }));
        } else if (data.chatId) {
          window.dispatchEvent(new CustomEvent("push-navigate", { detail: { page: "inbox", chatId: data.chatId } }));
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
