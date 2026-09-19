import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext();

const isValidToken = (t) => {
  return (
    typeof t === "string" &&
    t !== "undefined" &&
    t !== "null" &&
    t.trim().length > 20
  );
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingVerification, setPendingVerification] = useState(null); // { email, from: "signup" | "signin" }

  // Listen for user-loaded event from OAuth flow
  useEffect(() => {
    const handleUserLoaded = (event) => {
      if (event.detail) {
        setUser(event.detail);
        setLoading(false);
      }
    };
    window.addEventListener("auth-user-loaded", handleUserLoaded);
    return () => window.removeEventListener("auth-user-loaded", handleUserLoaded);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("omnixra_token");
    const cachedUser = localStorage.getItem("omnixra_user");

    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
      } catch (e) {
        localStorage.removeItem("omnixra_user");
      }
    }

    if (isValidToken(token)) {
      api
        .get("/auth/me")
        .then((res) => {
          setUser(res.data);
          localStorage.setItem("omnixra_user", JSON.stringify(res.data));
        })
        .catch((err) => {
          const status = err?.response?.status;
          if (status === 401 || status === 403) {
            localStorage.removeItem("omnixra_token");
            localStorage.removeItem("omnixra_user");
            setUser(null);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const storeRedirect = (page, data = {}) => {
    const redirectData = { page, ...data };
    localStorage.setItem("omnixra_redirect", JSON.stringify(redirectData));
  };

  // ── Signup ──
  // Returns { requiresVerification: true, email } on success — does NOT auto-login
  const signup = async (data) => {
    const res = await api.post("/auth/signup", data);

    if (isValidToken(res.data?.token)) {
      localStorage.setItem("omnixra_token", res.data.token);
      localStorage.setItem("omnixra_user", JSON.stringify(res.data));
      setUser(res.data);
      return { ...res.data, requiresVerification: false };
    }

    throw new Error("Signup succeeded but no valid token was returned");
  };

  // ── Signin ──
  // If 403 + requiresVerification → set pending state + return, don't throw
  const signin = async (data) => {
    try {
      const res = await api.post("/auth/signin", data);
      if (!isValidToken(res.data?.token)) {
        throw new Error("Login succeeded but no valid token was returned");
      }
      localStorage.setItem("omnixra_token", res.data.token);
      localStorage.setItem("omnixra_user", JSON.stringify(res.data));
      setUser(res.data);
      return { ...res.data, requiresVerification: false };
    } catch (err) {
      throw err;
    }
  };

  // ── Called after successful email verification ──
  // Backend returns full user + token
  const completeVerification = (userData) => {
    if (isValidToken(userData?.token)) {
      localStorage.setItem("omnixra_token", userData.token);
      localStorage.setItem("omnixra_user", JSON.stringify(userData));
      setUser(userData);
    }
    setPendingVerification(null);
  };

  const cancelVerification = () => setPendingVerification(null);

  const logout = () => {
    // Clear ALL user-scoped keys to prevent cross-account data leak
    const keysToRemove = [
      "omnixra_token",
      "omnixra_user",
      "omnixra_following",
      "omnixra_saved_posts",
      "omnixra_liked_posts",
      "omnixra_redirect",
      "omnixra_companies_cache_v1",
      "omnixra_jobs_cache_v1",
      "omnixra_news_cache",
      "omnixra_notif_prompted",
      "omnixra_chats_cache",
      "omnixra_inbox_cache",
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));

    // Nuke any leftover keys starting with omnixra_
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith("omnixra_") || k.startsWith("omnixra-")) {
        localStorage.removeItem(k);
      }
    });
    setUser(null);
    setPendingVerification(null);
  };

  const redeemVoucher = async (code) => {
    const res = await api.post("/vouchers/redeem", { code });
    const updated = { ...user, isPremium: true };
    localStorage.setItem("omnixra_user", JSON.stringify(updated));
    setUser(updated);
    return res.data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        signup,
        signin,
        logout,
        redeemVoucher,
        storeRedirect,
        pendingVerification,
        completeVerification,
        cancelVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
