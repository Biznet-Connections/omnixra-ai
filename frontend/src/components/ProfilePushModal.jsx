import React, { useState } from "react";
import { X, FileText, MapPin, User } from "lucide-react";
import api from "../api/axios";
import ProgressModal from "./ProgressModal";
import SuccessModal from "./SuccessModal";
import { useAuth } from "../context/AuthContext";

export default function ProfilePushModal({ company, onClose, onOpenChat }) {
  const { user } = useAuth();
  const [note, setNote] = useState("");
  const [step, setStep] = useState("form");
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState(null);

  const handlePush = async () => {
    setError("");
    setStep("loading");
    try {
      const res = await api.post(`/companies/${company._id}/contact`, {
        mode: "push_profile",
        message: note,
      });
      setConversationId(res.data.conversationId);
      setTimeout(() => setStep("success"), 700);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
      setStep("form");
    }
  };

  if (step === "loading") {
    return (
      <ProgressModal
        title="Pushing profile..."
        steps={[
          { label: "Profile card prepared", status: "done" },
          { label: "CV attached", status: "done" },
          { label: `Sending to ${company.name}`, status: "active" },
        ]}
      />
    );
  }

  if (step === "success") {
    return (
      <SuccessModal
        title="Profile sent!"
        message={`${company.name} received your profile and CV.`}
        primaryLabel="Open chat"
        onPrimary={() => { onClose(); onOpenChat && onOpenChat(conversationId); }}
        secondaryLabel="Browse more companies"
        onSecondary={onClose}
      />
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold">Push your profile</h2>
            <div className="text-xs text-slate-500 mt-0.5 truncate">to {company.name}</div>
          </div>
          <button onClick={onClose} className="icon-button flex-shrink-0"><X size={18} /></button>
        </div>

        <div className="rounded-xl border border-white/[.06] bg-white/[.02] p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt=""
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <User size={20} />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{user?.name}</div>
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin size={10} /> {user?.location || "Zimbabwe"}
              </div>
            </div>
          </div>

          {user?.headline && (
            <p className="text-xs text-slate-400 mb-2 line-clamp-2">{user.headline}</p>
          )}

          {user?.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {user.skills.slice(0, 5).map((s, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded bg-white/[.04] text-slate-400"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <FileText size={12} /> CV attached
          </div>
        </div>

        <label className="form-label">Add a note (optional)</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          className="form-textarea"
          rows={3}
          placeholder="I'm available immediately and ready to start..."
        />

        {error && <div className="text-xs text-red-400 mt-2">{error}</div>}

        <button onClick={handlePush} className="primary-button w-full mt-4">
          Push Profile
        </button>
      </div>
    </div>
  );
}
