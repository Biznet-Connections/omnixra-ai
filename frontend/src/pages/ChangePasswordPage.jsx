import React, { useState } from "react";
import { ArrowLeft, Lock, CheckCircle } from "lucide-react";
import api from "../api/axios";

export default function ChangePasswordPage({ setPage }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError("");
    if (!currentPassword) return setError("Enter current password");
    if (newPassword.length < 8) return setError("New password must be 8+ characters");
    if (newPassword !== confirm) return setError("Passwords don't match");

    setLoading(true);
    try {
      await api.put("/auth/change-password", { currentPassword, newPassword });
      setDone(true);
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

        <h1 className="page-title">Change Password</h1>
        <p className="page-subtitle">Keep your account secure.</p>

        {done ? (
          <div className="mt-7 text-center">
            <CheckCircle className="mx-auto text-emerald-400 mb-4" size={48} />
            <h2 className="text-lg font-bold mb-2">Password updated!</h2>
            <p className="text-xs text-slate-500 mb-6">Your new password is active.</p>
            <button onClick={() => setPage("settings")} className="primary-button">Back to settings</button>
          </div>
        ) : (
          <div className="mt-7 space-y-4">
            <div>
              <label className="form-label">Current password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="form-label">New password (8+ characters)</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="form-label">Confirm new password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="form-input"
                placeholder="••••••••"
              />
            </div>

            {error && <div className="text-xs text-red-400">{error}</div>}

            <button onClick={submit} disabled={loading} className="primary-button w-full">
              {loading ? "Updating..." : "Update password"} <Lock size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
