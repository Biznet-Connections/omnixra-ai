import axios from "axios";

// Detect local dev web (Vite dev server only)
const isDevWeb =
  typeof window !== "undefined" &&
  window.location.hostname === "localhost" &&
  window.location.port === "5173";

// Everything except local dev goes to production
const baseURL = isDevWeb
  ? "/api"
  : "https://omnixra-ai.com/api";

console.log("🔥 [AXIOS] baseURL =", baseURL, "| isDevWeb =", isDevWeb);

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
