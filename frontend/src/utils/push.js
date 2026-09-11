import api from "../api/axios";

// Detect native (Capacitor)
const isNative = typeof window !== "undefined" && (
  window.Capacitor?.isNativePlatform?.() ||
  window.location.protocol === "capacitor:" ||
  window.location.protocol === "file:"
);

// Dynamic import helper — bypasses Vite static analysis
async function loadPushPlugin() {
  const path = "@capacitor/push-notifications";
  return await import(/* @vite-ignore */ path);
}

export function getVapidPublicKey() {
  return api.get("/notifications/vapid-public-key").then(r => r.data.publicKey);
}

export async function subscribeUserToPush() {
  if (isNative) return subscribeNative();
  return subscribeWeb();
}

// ============ WEB PUSH ============
async function subscribeWeb() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("Push not supported in this browser");
      return null;
    }

    const reg = await navigator.serviceWorker.ready;
    const key = await getVapidPublicKey();
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key)
    });

    await api.post("/notifications/subscribe", { subscription });
    console.log("✅ Web push subscribed");
    return subscription;
  } catch (error) {
    console.error("Web push subscribe failed:", error);
    return null;
  }
}

// ============ NATIVE PUSH ============
async function subscribeNative() {
  try {
    const mod = await loadPushPlugin();
    const { PushNotifications } = mod;

    let permission = await PushNotifications.checkPermissions();
    if (permission.receive === "prompt") {
      permission = await PushNotifications.requestPermissions();
    }
    if (permission.receive !== "granted") {
      console.log("Native push permission not granted");
      return null;
    }

    return new Promise((resolve) => {
      PushNotifications.addListener("registration", async (token) => {
        console.log("📱 Native push token:", token.value);
        try {
          await api.post("/notifications/subscribe", {
            subscription: {
              endpoint: token.value,
              keys: { p256dh: "", auth: "" },
              native: true,
              platform: window.Capacitor?.getPlatform?.() || "android"
            }
          });
          console.log("✅ Native push token sent to server");
        } catch (err) {
          console.error("Failed to send native token to server:", err);
        }
        resolve(token);
      });

      PushNotifications.addListener("registrationError", (err) => {
        console.error("Native push registration error:", err);
        resolve(null);
      });

      PushNotifications.register();
    });
  } catch (error) {
    console.error("Native push subscribe failed:", error);
    return null;
  }
}

export async function unsubscribeFromPush() {
  try {
    if (isNative) {
      const mod = await loadPushPlugin();
      const { PushNotifications } = mod;
      await PushNotifications.removeAllListeners();
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      await api.delete("/notifications/unsubscribe", { data: { endpoint: sub.endpoint } });
    }
  } catch (error) {
    console.error("Unsubscribe error:", error);
  }
}

export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function requestNotificationPermission() {
  return new Promise((resolve) => {
    if (!("Notification" in window)) {
      resolve("unsupported");
      return;
    }
    Notification.requestPermission().then(resolve);
  });
}

export { isNative };
