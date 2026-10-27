import React, { useState, useEffect } from "react";
import { ArrowLeft, Send, Loader2, Paperclip, Smile, X } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const AVATAR_COLORS = ["#6366f1","#8b5cf6","#ec4899","#ef4444","#f59e0b","#10b981","#06b6d4","#3b82f6"];
function colorFor(name) {
  if (!name) return "#6366f1";
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function ReplyComposerScreen({ setPage }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const appId = sessionStorage.getItem("reply_target_app");
  const company = sessionStorage.getItem("reply_target_company") || "Company";
  const jobTitle = sessionStorage.getItem("reply_target_job") || "Job";

  const initial = (company[0] || "?").toUpperCase();
  const bg = colorFor(company);

  useEffect(() => {
    if (!appId) {
      setPage("inbox");
    }
  }, [appId]);

  const discard = () => {
    if (text.trim() && !window.confirm("Discard this reply?")) return;
    setPage("application-detail");
  };

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      await api.post(`/jobs/applications/${appId}/reply`, { text: text.trim() });
      setPage("application-detail");
    } catch (e) {
      if (e.response?.status === 402) {
        // Limit hit — send back to detail where premium modal opens
        sessionStorage.setItem("force_premium_modal", "1");
        setPage("application-detail");
      } else {
        setError(e.response?.data?.message || "Failed to send");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="composer-screen">
      <header className="composer-header">
        <button className="composer-back" onClick={discard}>
          <ArrowLeft size={18} />
        </button>
        <div className="composer-title">Reply</div>
        <button className="composer-discard" onClick={discard}>
          <X size={16} /> Discard
        </button>
      </header>

      <div className="composer-fields">
        <div className="composer-field">
          <div className="composer-label">From</div>
          <div className="composer-value">
            {user?.name || "You"}
            {user?.email ? <span className="composer-email">&lt;{user.email}&gt;</span> : null}
          </div>
        </div>

        <div className="composer-field">
          <div className="composer-label">To</div>
          <div className="composer-to">
            <div className="composer-avatar" style={{ background: bg }}>{initial}</div>
            <div className="min-w-0">
              <div className="composer-to-name">{company}</div>
              <div className="composer-to-sub">{jobTitle}</div>
            </div>
          </div>
        </div>

        <div className="composer-field">
          <div className="composer-label">Subject</div>
          <div className="composer-value">Re: {jobTitle}</div>
        </div>
      </div>

      <div className="composer-body">
        <textarea
          className="composer-textarea"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type your reply…"
          autoFocus
        />
      </div>

      {error ? <div className="composer-error">{error}</div> : null}

      <footer className="composer-footer">
        <button className="composer-icon" title="Attach (coming soon)"><Paperclip size={18} /></button>
        <button className="composer-icon" title="Emoji (coming soon)"><Smile size={18} /></button>
        <div className="flex-1" />
        <button
          className="composer-send"
          disabled={sending || !text.trim()}
          onClick={send}
        >
          {sending ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
          {sending ? "Sending…" : "Send"}
        </button>
      </footer>
    </div>
  );
}
