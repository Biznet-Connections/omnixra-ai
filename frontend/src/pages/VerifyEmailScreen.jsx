import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, Mail, Sparkles } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

function VerifyEmailScreen({ email, setPage }) {
  const { completeVerification, cancelVerification } = useAuth();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputs = useRef([]);

  // Countdown timer
  useEffect(() => {
    if (resendIn <= 0) {
      setCanResend(true);
      return;
    }
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // Focus first input on mount
  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const handleChange = (idx, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...code];
    next[idx] = value;
    setCode(next);
    if (value && idx < 5) {
      inputs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "");
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      inputs.current[5]?.focus();
    }
  };

  const handleSubmit = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Please enter all 6 digits.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-email", { email, code: fullCode });
      // Success — user is verified + we have token
      completeVerification(res.data);
      setPage?.("home");
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed. Try again.");
      setCode(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setCanResend(false);
    setResendIn(60);
    setError("");
    try {
      await api.post("/auth/resend-code", { email });
    } catch (err) {
      setError(err.response?.data?.message || "Could not resend code.");
    }
  };

  const handleBack = () => {
    cancelVerification();
    setPage?.("home"); // Will land on auth screen if not logged in
  };

  return (
    <div className="min-h-screen auth-background flex items-center justify-center p-4">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />

      <div className="w-full max-w-md relative z-10">
        <div className="auth-card">
          <button onClick={handleBack} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="text-center mb-6">
            <div className="logo-orb mx-auto mb-4">
              <Mail size={26} strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-bold">Check your email</h1>
            <p className="text-xs text-slate-500 mt-2">
              We sent a 6-digit code to <strong className="text-slate-300">{email}</strong>
            </p>
          </div>

          {/* 6-digit input */}
          <div className="otp-row" onPaste={handlePaste}>
            {code.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="otp-box"
              />
            ))}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || code.some((d) => !d)}
            className="primary-button w-full mt-5 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify code"}
            {!loading && <Sparkles size={16} />}
          </button>

          <div className="text-center text-xs text-slate-500 mt-5">
            Didn't get it?{" "}
            {canResend ? (
              <button onClick={handleResend} className="text-indigo-400 hover:text-indigo-300 ml-1">
                Resend code
              </button>
            ) : (
              <span className="text-slate-600">Resend in {resendIn}s</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmailScreen;
