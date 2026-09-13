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

    // If backend asks for verification, set pending state and return
    if (res.data?.requiresVerification) {
      setPendingVerification({ email: res.data.email, from: "signup" });
      return { requiresVerification: true, email: res.data.email };
    }

    // Admin path — got token directly
    if (isValidToken(res.data?.token)) {
      localStorage.setItem("omnixra_token", res.data.token);
      localStorage.setItem("omnixra_user", JSON.stringify(res.data));
      setUser(res.data);
      return { ...res.data, requiresVerification: false };
    }

    throw new Error("Signup succeeded but no valid response");
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
      const status = err?.response?.status;
      const body = err?.response?.data;
      if (status === 403 && body?.requiresVerification) {
        setPendingVerification({ email: body.email, from: "signin" });
        return { requiresVerification: true, email: body.email };
      }
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
    localStorage.removeItem("omnixra_token");
    localStorage.removeItem("omnixra_user");
    localStorage.removeItem("omnixra_following");
    localStorage.removeItem("omnixra_saved_posts");
    localStorage.removeItem("omnixra_redirect");
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
