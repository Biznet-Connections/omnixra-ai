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

  useEffect(() => {
    const token = localStorage.getItem("omnixra_token");
    console.log("🔥 [AUTH] Mount token:", token);
    console.log("🔥 [AUTH] Token valid?", isValidToken(token));

    if (isValidToken(token)) {
      api
        .get("/auth/me")
        .then((res) => {
          console.log("🔥 [AUTH] /auth/me OK:", res.data?.name || res.data?.email);
          setUser(res.data);
        })
        .catch((err) => {
          console.error("🔥 [AUTH] /auth/me failed:", err?.response?.status, err?.response?.data);
          localStorage.removeItem("omnixra_token");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      console.warn("🔥 [AUTH] No valid token, skipping /auth/me");
      localStorage.removeItem("omnixra_token");
      setLoading(false);
    }
  }, []);

  const storeRedirect = (page, data = {}) => {
    const redirectData = { page, ...data };
    localStorage.setItem("omnixra_redirect", JSON.stringify(redirectData));
  };

  const signup = async (data) => {
    const res = await api.post("/auth/signup", data);
    console.log("🔥 [SIGNUP] STATUS:", res.status);
    console.log("🔥 [SIGNUP] RESPONSE KEYS:", Object.keys(res.data || {}));
    console.log("🔥 [SIGNUP] TOKEN:", res.data?.token);
    console.log("🔥 [SIGNUP] TOKEN TYPE:", typeof res.data?.token);

    if (!isValidToken(res.data?.token)) {
      console.error("🚨 [SIGNUP] Backend did not return a valid token. Full response:", res.data);
      throw new Error("Signup succeeded but no valid token was returned");
    }

    localStorage.setItem("omnixra_token", res.data.token);
    console.log("🔥 [SIGNUP] Stored token:", localStorage.getItem("omnixra_token")?.substring(0, 40));
    setUser(res.data);
    return res.data;
  };

  const signin = async (data) => {
    const res = await api.post("/auth/signin", data);
    console.log("🔥 [SIGNIN] STATUS:", res.status);
    console.log("🔥 [SIGNIN] RESPONSE KEYS:", Object.keys(res.data || {}));
    console.log("🔥 [SIGNIN] TOKEN:", res.data?.token);
    console.log("🔥 [SIGNIN] TOKEN TYPE:", typeof res.data?.token);

    if (!isValidToken(res.data?.token)) {
      console.error("🚨 [SIGNIN] Backend did not return a valid token. Full response:", res.data);
      throw new Error("Login succeeded but no valid token was returned");
    }

    localStorage.setItem("omnixra_token", res.data.token);
    console.log("🔥 [SIGNIN] Stored token:", localStorage.getItem("omnixra_token")?.substring(0, 40));
    setUser(res.data);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("omnixra_token");
    localStorage.removeItem("omnixra_following");
    localStorage.removeItem("omnixra_saved_posts");
    localStorage.removeItem("omnixra_redirect");
    setUser(null);
  };

  const redeemVoucher = async (code) => {
    const res = await api.post("/vouchers/redeem", { code });
    setUser({ ...user, isPremium: true });
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, signup, signin, logout, redeemVoucher, storeRedirect }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
