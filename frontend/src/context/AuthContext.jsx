import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("omnixra_token");
    if (token) {
      api
        .get("/auth/me")
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem("omnixra_token");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const signup = async (data) => {
    const res = await api.post("/auth/signup", data);
    localStorage.setItem("omnixra_token", res.data.token);
    setUser(res.data);
    return res.data;
  };

  const signin = async (data) => {
    const res = await api.post("/auth/signin", data);
    localStorage.setItem("omnixra_token", res.data.token);
    setUser(res.data);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("omnixra_token");
    setUser(null);
  };

  const redeemVoucher = async (code) => {
    const res = await api.post("/vouchers/redeem", { code });
    setUser({ ...user, isPremium: true });
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, signup, signin, logout, redeemVoucher }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
