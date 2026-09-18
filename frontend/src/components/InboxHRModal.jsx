import React, { useState } from "react";
import { X } from "lucide-react";
import api from "../api/axios";
import ProgressModal from "./ProgressModal";
import SuccessModal from "./SuccessModal";
import { useAuth } from "../context/AuthContext";

const buildTemplates = (user, companyName) => [
  {
    label: "Introduce yourself",
    text: `Hi ${companyName} team,\n\nI'm ${user?.name || ""}, a ${user?.category || "professional"} based in ${user?.location || "Zimbabwe"}. I'm very interested in any opportunities you may have.\n\nBest regards,\n${user?.name || ""}`,
  },
  {
    label: "Ask about openings",
    text: `Hi ${companyName} team,\n\nI noticed your company and would love to know about any current or upcoming openings. Could you share what roles you are hiring for?\n\nThanks,\n${user?.name || ""}`,
  },
  {
    label: "Available for hire",
    text: `Hi ${companyName} team,\n\nI'm currently available for hire and very interested in working with your team. My background is in ${user?.category || "general work"}.\n\nLooking forward to hearing from you,\n${user?.name || ""}`,
  },
];

export default function InboxHRModal({ company, onClose, onOpenChat }) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [step, setStep] = useState("form");
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState(null);

  const templates = buildTemplates(user, company.name);

  const handleSend = async () => {
    if (!message.trim()) { setError("Write a message first."); return; }
    setError("");
    setStep("loading");
    try {
      const res = await api.post(`/companies/${company._id}/contact`, {
        mode: "inbox",
        message,
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
        title="Sending message..."
        steps={[
          { label: "Message ready", status: "done" },
          { label: `Delivering to ${company.name}`, status: "active" },
        ]}
      />
    );
  }

  if (step === "success") {
    return (
      <SuccessModal
        title="Message sent!"
        message={`${company.name} will see it in their Omnixra inbox.`}
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
            <h2 className="text-base font-bold truncate">Message {company.name}</h2>
            <div className="text-xs text-slate-500 mt-0.5">Inbox HR</div>
          </div>
          <button onClick={onClose} className="icon-button flex-shrink-0"><X size={18} /></button>
        </div>

        <div className="mb-3">
          <div className="text-xs text-slate-500 mb-2">Quick start:</div>
          <div className="flex flex-wrap gap-2">
            {templates.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setMessage(t.text)}
                className="text-[10px] px-2 py-1 rounded-md border border-white/[.06] bg-white/[.02] text-slate-400 hover:text-white hover:border-white/[.15] transition-colors"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          className="form-textarea"
          rows={7}
          placeholder="Write your message..."
        />

        {error && <div className="text-xs text-red-400 mt-2">{error}</div>}

        <button onClick={handleSend} className="primary-button w-full mt-4">
          Send message
        </button>
      </div>
    </div>
  );
}
