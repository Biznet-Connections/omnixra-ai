import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Mail, Lock, Sparkles, Check } from "lucide-react";
import api from "../api/axios";

function ForgotPasswordFlow({ onClose }) {
  const [step, setStep] = useState(1); // 1=email, 2=code, 3=newpass, 4=success
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const inputRefs = useRef([]);

  // Countdown for resend
  useEffect(() => {
    if (step !== 2) return;
    if (resendIn <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn, step]);

  // ── STEP 1 — Send code ──
  const sendCode = async () => {
    setError("");
    if (!email.trim()) { setError("Enter your email"); return; }
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setStep(2);
      setResendIn(60);
      setCanResend(false);
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    } catch (e) {
      setError(e.response?.data?.message || "Could not send code");
    } finally {
      setLoading(false);
    }
  };

  // ── Resend ──
  const resendCode = async () => {
    if (!canResend) return;
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setResendIn(60);
      setCanResend(false);
      setCode(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (e) {
      setError(e.response?.data?.message || "Could not resend");
    } finally {
      setLoading(false);
    }
  };

  // ── Code input handlers ──
  const handleCodeChange = (idx, val) => {
    const v = val.replace(/[^0-9]/g, "").slice(0, 1);
    const copy = [...code];
    copy[idx] = v;
    setCode(copy);
    if (v && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleCodePaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData.getData("text") || "").replace(/[^0-9]/g, "").slice(0, 6);
    if (!pasted) return;
    const copy = ["", "", "", "", "", ""];
    pasted.split("").forEach((c, i) => { copy[i] = c; });
    setCode(copy);
    const nextIdx = Math.min(pasted.length, 5);
    inputRefs.current[nextIdx]?.focus();
  };

  // ── STEP 2 — Verify code ──
  const verifyCode = async () => {
    setError("");
    const fullCode = code.join("");
    if (fullCode.length !== 6) { setError("Enter all 6 digits"); return; }
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-reset-code", {
        email: email.trim(),
        code: fullCode,
      });
      if (!res.data?.resetToken) { setError("Could not verify"); return; }
      setResetToken(res.data.resetToken);
      setStep(3);
    } catch (e) {
      setError(e.response?.data?.message || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 3 — Reset password ──
  const resetPassword = async () => {
    setError("");
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        resetToken,
        newPassword,
      });
      setStep(4);
    } catch (e) {
      setError(e.response?.data?.message || "Could not reset password");
    } finally {
      setLoading(false);
    }
  };

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
        </div>

        <div className="auth-card">
          <button onClick={onClose} className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 mb-4">
            <ArrowLeft size={14} /> Back to sign in
          </button>

          {/* STEP 1 — Email */}
          {step === 1 && (
            <>
              <h2 className="text-lg font-bold mb-2">Reset your password</h2>
              <p className="text-xs text-slate-500 mb-5">
                We will send a 6-digit code to your email.
              </p>
              <label className="form-label">Email address</label>
              <div className="form-field">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendCode()}
                  className="form-input has-icon"
                  placeholder="your@email.com"
                  autoComplete="email"
                  autoCapitalize="none"
                />
              </div>
              {error && <div className="mt-3 text-xs text-red-400">{error}</div>}
              <button
                onClick={sendCode}
                disabled={loading}
                className="primary-button w-full mt-5 disabled:opacity-70"
              >
                {loading ? "Sending..." : "Send reset code"}
              </button>
            </>
          )}

          {/* STEP 2 — Code */}
          {step === 2 && (
            <>
              <h2 className="text-lg font-bold mb-2">Check your email</h2>
              <p className="text-xs text-slate-500 mb-5">
                We sent a code to <strong>{email}</strong>
              </p>

              <div className="code-input-row">
                {code.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="tel"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(idx, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(idx, e)}
                    onPaste={handleCodePaste}
                    className="code-input-box"
                    autoComplete="one-time-code"
                  />
                ))}
              </div>

              {error && <div className="mt-3 text-xs text-red-400">{error}</div>}

              <button
                onClick={verifyCode}
                disabled={loading || code.join("").length !== 6}
                className="primary-button w-full mt-5 disabled:opacity-70"
              >
                {loading ? "Verifying..." : "Verify code"}
              </button>

              <div className="flex items-center justify-between mt-4 text-xs">
                <button
                  onClick={() => { setStep(1); setCode(["", "", "", "", "", ""]); setError(""); }}
                  className="text-slate-500 hover:text-slate-300"
                >
                  Change email
                </button>
                <button
                  onClick={resendCode}
                  disabled={!canResend || loading}
                  className={canResend ? "text-indigo-400 hover:text-indigo-300" : "text-slate-600 cursor-not-allowed"}
                >
                  {canResend ? "Resend code" : "Resend in " + resendIn + "s"}
                </button>
              </div>
            </>
          )}

          {/* STEP 3 — New password */}
          {step === 3 && (
            <>
              <h2 className="text-lg font-bold mb-2">Set new password</h2>
              <p className="text-xs text-slate-500 mb-5">
                Choose a strong password you will remember.
              </p>

              <label className="form-label">New password</label>
              <div className="form-field">
                <Lock size={16} className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-input has-icon has-right"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <label className="form-label mt-4">Confirm new password</label>
              <div className="form-field">
                <Lock size={16} className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && resetPassword()}
                  className="form-input has-icon"
                  autoComplete="new-password"
                />
              </div>

              {newPassword && newPassword.length < 6 && (
                <div className="mt-2 text-xs text-amber-400">Password must be at least 6 characters</div>
              )}
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <div className="mt-2 text-xs text-red-400">Passwords do not match</div>
              )}
              {error && <div className="mt-3 text-xs text-red-400">{error}</div>}

              <button
                onClick={resetPassword}
                disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
                className="primary-button w-full mt-5 disabled:opacity-70"
              >
                {loading ? "Saving..." : "Save new password"}
              </button>
            </>
          )}

          {/* STEP 4 — Success */}
          {step === 4 && (
            <div className="text-center py-6">
              <div className="success-orb mx-auto mb-4">
                <Check size={32} strokeWidth={3} />
              </div>
              <h2 className="text-lg font-bold mb-2">Password reset</h2>
              <p className="text-xs text-slate-500 mb-6">
                You can now sign in with your new password.
              </p>
              <button onClick={onClose} className="primary-button w-full">
                Sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordFlow;
