import React, { useState, useRef, useEffect } from "react";
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
  const inputs = useRef([]);

  useEffect(() => {
    if (step !== 2) return;
    if (resendIn <= 0) {
      setCanResend(true);
      return;
    }
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, resendIn]);

  useEffect(() => {
    if (step === 2) inputs.current[0]?.focus();
  }, [step]);

  // ── Step 1: Send code ──
  const handleSendCode = async () => {
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
      setStep(2);
      setResendIn(60);
      setCanResend(false);
    } catch (err) {
      setError(err.response?.data?.message || "Could not send code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify code ──
  const handleChange = (idx, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...code];
    next[idx] = value;
    setCode(next);
    if (value && idx < 5) inputs.current[idx + 1]?.focus();
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

  const handleVerifyCode = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Please enter all 6 digits.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/verify-reset-code", { email: email.trim().toLowerCase(), code: fullCode });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || "Incorrect code. Try again.");
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
      await api.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
    } catch (err) {
      setError(err.response?.data?.message || "Could not resend.");
    }
  };

  // ── Step 3: New password ──
  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        email: email.trim().toLowerCase(),
        code: code.join(""),
        newPassword,
      });
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.message || "Could not reset password.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 1) {
      onClose?.();
    } else {
      setStep(step - 1);
      setError("");
    }
  };

  // ── Render ──
  return (
    <div className="min-h-screen auth-background flex items-center justify-center p-4">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />

      <div className="w-full max-w-md relative z-10">
        <div className="auth-card">
          {step !== 4 && (
            <button onClick={handleBack} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
              <ArrowLeft size={16} />
              {step === 1 ? "Back to Sign in" : "Back"}
            </button>
          )}

          {/* STEP 1 — Email */}
          {step === 1 && (
            <>
              <h1 className="text-2xl font-bold">Forgot Password?</h1>
              <p className="text-xs text-slate-500 mt-2">
                Enter your email and we'll send you a reset code.
              </p>
              <div className="mt-5">
                <label className="form-label">Email address</label>
                <div className="form-field">
                  <Mail size={16} className="input-icon" />
                  <input
                    type="email"
                    name="forgot_email"
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                    className="form-input has-icon"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              {error && <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">{error}</div>}
              <button onClick={handleSendCode} disabled={loading} className="primary-button w-full mt-5 disabled:opacity-50">
                {loading ? "Sending..." : "Send reset code"}
                {!loading && <Sparkles size={16} />}
              </button>
            </>
          )}

          {/* STEP 2 — OTP */}
          {step === 2 && (
            <>
              <div className="text-center mb-6">
                <div className="logo-orb mx-auto mb-4">
                  <Mail size={26} strokeWidth={2} />
                </div>
                <h1 className="text-2xl font-bold">Check your email</h1>
                <p className="text-xs text-slate-500 mt-2">
                  We sent a 6-digit code to <strong className="text-slate-300">{email}</strong>
                </p>
              </div>
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
              {error && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 text-center">{error}</div>}
              <button onClick={handleVerifyCode} disabled={loading || code.some((d) => !d)} className="primary-button w-full mt-5 disabled:opacity-50">
                {loading ? "Verifying..." : "Verify code"}
              </button>
              <div className="text-center text-xs text-slate-500 mt-4">
                Didn't get it?{" "}
                {canResend ? (
                  <button onClick={handleResend} className="text-indigo-400 hover:text-indigo-300 ml-1">
                    Resend
                  </button>
                ) : (
                  <span className="text-slate-600">Resend in {resendIn}s</span>
                )}
              </div>
            </>
          )}

          {/* STEP 3 — New Password */}
          {step === 3 && (
            <>
              <h1 className="text-2xl font-bold">Set new password</h1>
              <p className="text-xs text-slate-500 mt-2">Choose a strong password.</p>

              <div className="mt-5">
                <label className="form-label">New password</label>
                <div className="form-field">
                  <Lock size={16} className="input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="new_password"
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="form-input has-icon has-right"
                    placeholder="At least 6 characters"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="password-toggle">
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <label className="form-label">Confirm password</label>
                <div className="form-field">
                  <Lock size={16} className="input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirm_password"
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-input has-icon"
                    placeholder="Same as above"
                  />
                </div>
              </div>

              {error && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">{error}</div>}

              <button onClick={handleResetPassword} disabled={loading} className="primary-button w-full mt-5 disabled:opacity-50">
                {loading ? "Updating..." : "Update password"}
              </button>
            </>
          )}

          {/* STEP 4 — Success */}
          {step === 4 && (
            <div className="text-center py-4">
              <div className="check-circle">
                <Check size={36} strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl font-bold mt-5">Password updated</h1>
              <p className="text-xs text-slate-500 mt-2">
                You can now sign in with your new password.
              </p>
              <button onClick={onClose} className="primary-button w-full mt-6">
                Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordFlow;
