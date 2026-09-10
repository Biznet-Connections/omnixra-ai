import React, { useState } from "react";
import { Sparkles, Mail, Lock, Shield, Zap, ArrowRight } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

function AdminLogin({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { setUser } = useAuth();

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/admin-login", { email, password });
      localStorage.setItem("omnixra_token", res.data.token);
      setUser(res.data);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Access denied");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-root">
      <div className="admin-grid-bg" />
      <div className="admin-glow admin-glow-1" />
      <div className="admin-glow admin-glow-2" />

      <div className="admin-login-panel">
        <div className="admin-orb-pulse">
          <div className="admin-orb-inner">
            <Zap size={32} strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="admin-login-title">
          OMNIXRA<span className="admin-accent">⚡</span>
        </h1>

        <div className="admin-restricted-badge">
          <Shield size={12} />
          <span>RESTRICTED ACCESS · AUTHORIZED ONLY</span>
        </div>

        <div className="admin-form">
          <div className="admin-field">
            <Mail size={16} className="admin-field-icon" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@omnixra.ai"
              className="admin-input"
              autoComplete="off"
            />
          </div>

          <div className="admin-field">
            <Lock size={16} className="admin-field-icon" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="Enter admin password"
              className="admin-input"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="admin-toggle-pw"
            >
              {showPassword ? "HIDE" : "SHOW"}
            </button>
          </div>

          {error && (
            <div className="admin-error">
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="admin-submit-btn"
          >
            {loading ? (
              <span>⏳ AUTHENTICATING...</span>
            ) : (
              <>
                <Zap size={16} />
                <span>ENTER COMMAND CENTER</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        <div className="admin-warning">
          All access attempts are logged and monitored.
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
