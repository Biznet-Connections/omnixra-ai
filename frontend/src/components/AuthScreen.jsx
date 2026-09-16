import React, { useState, useEffect } from "react";
import { Sparkles, Mail, Lock, MapPin, Building2, User, ArrowRight, Search, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import ForgotPasswordFlow from "../pages/ForgotPasswordFlow";
import { useNotifications } from "../context/NotificationContext";

function AuthScreen() {
  const [mode, setMode] = useState("signup"); // ✅ SIGNUP-FIRST
  const [forgotPassword, setForgotPassword] = useState(false);
  const [accountType, setAccountType] = useState("jobseeker");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    companyName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { signup, signin } = useAuth();
  const { requestPermission } = useNotifications();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError("");
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const name = accountType === "company"
          ? formData.companyName
          : (formData.firstName + " " + formData.lastName).trim();

        if (!name) {
          setError(accountType === "company" ? "Enter your company name" : "Enter your name");
          setLoading(false);
          return;
        }

        await signup({
          name,
          email: formData.email,
          password: formData.password,
          accountType,
          companyName: accountType === "company" ? formData.companyName : undefined,
        });

        try {
          if (requestPermission) {
            requestPermission().catch((e) => console.warn("Push permission skipped:", e.message));
          }
        } catch (e) { /* silent */ }
      } else {
        await signin({
          email: formData.email,
          password: formData.password,
        });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (forgotPassword) {
    return <ForgotPasswordFlow onClose={() => setForgotPassword(false)} />;
  }

  return (
    <div className="min-h-screen auth-background flex items-center justify-center p-4">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />

      <div className="w-full max-w-md relative z-10">
        <div className="auth-header">
          <div className="flex items-center gap-3 justify-center">
            <div className="logo-orb">
              <Sparkles size={21} strokeWidth={2.2} />
            </div>
            <div className="text-left">
              <div className="text-[19px] font-bold tracking-tight">
                omnixra<span className="text-indigo-400">-AI</span>
              </div>
              <div className="text-[8px] text-slate-600 tracking-[.18em]">
                EMPLOYMENT INTELLIGENCE
              </div>
            </div>
          </div>

          <div className="auth-badge">
            <Sparkles size={12} />
            AI-powered employment network
          </div>
        </div>

        <div className="auth-card">
          {/* ── Two-tab header ── */}
          <div className="auth-tabs">
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={"auth-tab " + (mode === "signup" ? "auth-tab-active" : "")}
            >
              Sign up
            </button>
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={"auth-tab " + (mode === "signin" ? "auth-tab-active" : "")}
            >
              Sign in
            </button>
          </div>

          {/* ── Header copy ── */}
          <div className="auth-tab-content">
            <h1 className="auth-title">
              {mode === "signup" ? "Welcome to Omnixra" : "Welcome back"}
            </h1>
            <p className="auth-subtitle">
              {mode === "signup"
                ? "Find opportunities. Discover talent. Grow."
                : "Your career intelligence is waiting."}
            </p>
          </div>

          {/* ── Account type picker (signup only) ── */}
          {mode === "signup" && (
            <div className="mb-5">
              <div className="text-[11px] text-slate-500 mb-2">I am joining as</div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setAccountType("jobseeker")} className={"auth-choice " + (accountType === "jobseeker" ? "auth-choice-active" : "")}>
                  <User size={16} />
                  <span>Job Seeker</span>
                </button>
                <button type="button" onClick={() => setAccountType("company")} className={"auth-choice " + (accountType === "company" ? "auth-choice-active" : "")}>
                  <Building2 size={16} />
                  <span>Company</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Signup name fields ── */}
          {mode === "signup" && accountType === "jobseeker" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">First name</label>
                <input name="firstName" autoComplete="given-name" autoCapitalize="words" value={formData.firstName} onChange={handleChange} className="form-input" />
              </div>
              <div>
                <label className="form-label">Last name</label>
                <input name="lastName" autoComplete="family-name" autoCapitalize="words" value={formData.lastName} onChange={handleChange} className="form-input" />
              </div>
            </div>
          )}

          {mode === "signup" && accountType === "company" && (
            <div>
              <label className="form-label">Company name</label>
              <div className="form-field">
                <Building2 size={16} className="input-icon" />
                <input name="companyName" autoComplete="organization" autoCapitalize="words" value={formData.companyName} onChange={handleChange} className="form-input has-icon" />
              </div>
            </div>
          )}

          {/* ── Email ── */}
          <div className="mt-4">
            <label className="form-label">Email address</label>
            <div className="form-field">
              <Mail size={16} className="input-icon" />
              <input
                type="email"
                name="email"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                inputMode="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input has-icon"
              />
            </div>
          </div>

          {/* ── Password ── */}
          <div className="mt-4">
            <label className="form-label">Password</label>
            <div className="form-field">
              <Lock size={16} className="input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                value={formData.password}
                onChange={handleChange}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="form-input has-icon has-right"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle">
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
              {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} className="primary-button w-full mt-6 disabled:opacity-70">
            {loading ? (
              <span className="btn-loading">
                <span className="btn-loading-dot" />
                <span className="btn-loading-dot" />
                <span className="btn-loading-dot" />
                <span className="btn-loading-text">{mode === "signup" ? "Creating account..." : "Signing in..."}</span>
              </span>
            ) : (
              <>
                {mode === "signup" ? "Create my account" : "Sign in"}
                <ArrowRight size={16} />
              </>
            )}
          </button>

          {mode === "signin" && (
            <div className="text-center mt-4">
              <button
                onClick={() => setForgotPassword(true)}
                className="text-xs text-slate-600 hover:text-slate-500"
              >
                Forgot Password?
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthScreen;
