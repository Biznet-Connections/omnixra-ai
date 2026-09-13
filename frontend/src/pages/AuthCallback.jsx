import React, { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

function AuthCallback({ setPage }) {
  const { setUser } = useAuth();

  useEffect(() => {
    try {
      const hash = window.location.hash || "";
      const params = new URLSearchParams(hash.replace("#", ""));
      const token = params.get("token");
      const userId = params.get("userId");

      if (token && token.length > 20) {
        localStorage.setItem("omnixra_token", token);
        // Refresh user from /auth/me
        import("../api/axios").then(({ default: api }) => {
          api.get("/auth/me")
            .then((res) => {
              localStorage.setItem("omnixra_user", JSON.stringify(res.data));
              setUser(res.data);
              // Clean URL + go home
              window.history.replaceState({}, "", "/");
              setPage?.("home");
            })
            .catch((err) => {
              console.error("Auth callback /auth/me failed:", err.message);
              window.history.replaceState({}, "", "/");
              setPage?.("home");
            });
        });
      } else {
        console.warn("Auth callback: no token in URL");
        window.history.replaceState({}, "", "/");
        setPage?.("home");
      }
    } catch (e) {
      console.error("Auth callback error:", e);
      window.history.replaceState({}, "", "/");
      setPage?.("home");
    }
  }, [setUser, setPage]);

  return (
    <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
      Signing you in...
    </div>
  );
}

export default AuthCallback;
