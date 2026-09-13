import axios from "axios";

// Detect if running inside Capacitor (native Android/iOS app)
const isNative = typeof window !== "undefined" && (
  window.Capacitor?.isNativePlatform?.() ||
  window.location.protocol === "capacitor:" ||
  window.location.protocol === "file:"
);

// API base URL:
// - Native app → always production
// - Web dev    → /api (proxied by Vite)
// - Web prod   → production
const baseURL = isNative
  ? "https://omnixra-ai.com/api"
  : (import.meta.env.PROD ? "https://omnixra-ai.com/api" : "/api");

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("omnixra_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
