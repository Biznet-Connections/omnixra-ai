import React, { useState } from "react";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

export default function ChangeEmailPage({ setPage }) {
  const { user, setUser } = useAuth();
  const [step, setStep] = useState("input"); // input | verify | done
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    setError("");
    if (!newEmail.trim()) return setError("Enter new email");
    setLoading(true);
    try {
      await api.post("/auth/change-email", { newEmail: newEmail.trim() });
      setStep("verify");
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-email-change", { code });
      setUser({ ...user, email: res.data.email });
      localStorage.setItem("omnixra_user", JSON.stringify({ ...user, email: res.data.email }));
      setStep("done");
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button onClick={() => setPage("settings")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
          <ArrowLeft size={16} /> Back
        </button>

        <h1 className="page-title">Change Email</h1>
        <p className="page-subtitle">Update the email address on your account.</p>

        {step === "input" && (
          <div className="mt-7 space-y-4">
            <div className="rounded-lg border border-white/[.06] bg-white/[.02] p-3 text-xs text-slate-500">
              Current: <strong className="text-slate-300">{user?.email}</strong>
            </div>

            <div>
              <label className="form-label">New email address</label>
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                className="form-input"
                placeholder="newemail@example.com"
              />
            </div>

            {error && <div className="text-xs text-red-400">{error}</div>}

            <button onClick={sendCode} disabled={loading} className="primary-button w-full">
              {loading ? "Sending..." : "Send verification code"} <Mail size={14} />
            </button>
          </div>
        )}

        {step === "verify" && (
          <div className="mt-7 space-y-4">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[.04] p-3 text-xs text-emerald-400">
              Code sent to <strong>{newEmail}</strong>
            </div>

            <div>
              <label className="form-label">6-digit code</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="form-input text-center text-lg tracking-widest"
                placeholder="000000"
              />
            </div>

            {error && <div className="text-xs text-red-400">{error}</div>}

            <button onClick={verifyCode} disabled={loading || code.length !== 6} className="primary-button w-full">
              {loading ? "Verifying..." : "Confirm change"} <CheckCircle size={14} />
            </button>

            <button onClick={() => setStep("input")} className="secondary-button w-full justify-center">
              Use different email
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="mt-7 text-center">
            <CheckCircle className="mx-auto text-emerald-400 mb-4" size={48} />
            <h2 className="text-lg font-bold mb-2">Email updated!</h2>
            <p className="text-xs text-slate-500 mb-6">Your new email is <strong>{user?.email}</strong></p>
            <button onClick={() => setPage("settings")} className="primary-button">Back to settings</button>
          </div>
        )}
      </div>
    </div>
  );
}
