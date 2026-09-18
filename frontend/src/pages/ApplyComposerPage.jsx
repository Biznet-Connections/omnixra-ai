import React, { useState, useEffect } from "react";
import { X, Send, Paperclip, Sparkles, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import api from "../api/axios";

export default function ApplyComposerPage({ job, onClose, onSuccess }) {
  const [message, setMessage] = useState("");
  const [cvFile, setCvFile] = useState(null);
  const [cvName, setCvName] = useState("");
  const [generating, setGenerating] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [deliveredVia, setDeliveredVia] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setGenerating(true);
        const res = await api.post("/ai/apply-cover-letter", { jobId: job._id });
        if (!cancelled) setMessage(res.data.message || res.data.coverLetter || "");
      } catch (e) {
        if (!cancelled) {
          setMessage(
            `Dear Hiring Manager,\n\nI am writing to apply for the ${job.title} position at ${job.company}. I believe my background and skills make me a strong fit for this role.\n\nI would welcome the opportunity to discuss how I can contribute.\n\nYours faithfully,\n`
          );
        }
      } finally {
        if (!cancelled) setGenerating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [job._id, job.title, job.company]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCvName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => setCvFile(reader.result);
    reader.readAsDataURL(file);
  };

  const regenerate = async () => {
    try {
      setGenerating(true);
      const res = await api.post("/ai/apply-cover-letter", { jobId: job._id });
      setMessage(res.data.message || res.data.coverLetter || "");
    } catch (e) {
      setError("Could not regenerate. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const send = async () => {
    if (sending) return;
    if (!message.trim()) {
      setError("Write a message first.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await api.post(`/jobs/${job._id}/apply-omnixra`, {
        message,
        cvAttachment: cvFile,
        cvName: cvName || null,
      });
      setDeliveredVia(res.data.method === "dm" ? "Omnixra inbox" : res.data.deliveredTo || "email");
      setSuccess(true);
      setTimeout(() => onSuccess?.(res.data), 2200);
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message;

      if (status === 409) {
        setDeliveredVia("previous application");
        setSuccess(true);
        setTimeout(() => onSuccess?.(e.response.data), 2200);
      } else if (status === 403) {
        setError(msg || "Upgrade to Starter to use this feature.");
      } else if (status === 400) {
        setError(msg || "Please check your message and try again.");
      } else if (status === 401) {
        setError("Please sign in again.");
      } else {
        setError(msg || "Could not send application. Please try again.");
      }
    } finally {
      setSending(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 bg-[#06070b] flex flex-col items-center justify-center text-white p-6">
        <CheckCircle className="text-emerald-400 mb-4" size={64} />
        <h2 className="text-xl font-bold mb-2">Application sent!</h2>
        <p className="text-sm text-white/60 mb-1">Delivered to {job.company}</p>
        <p className="text-xs text-white/40">via {deliveredVia}</p>
        <p className="text-xs text-white/40 mt-4">We'll notify you when they respond.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#06070b] flex flex-col text-white">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[.06]">
        <button onClick={onClose} className="icon-button"><ArrowLeft size={18} /></button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">Application — {job.title}</h2>
          <div className="text-xs text-slate-500 truncate">{job.company}</div>
        </div>
        <button onClick={send} disabled={sending || generating} className="primary-button">
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {sending ? "Sending..." : "Send"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="form-label">To</label>
          <div className="text-sm text-slate-300">{job.company} HR</div>
        </div>

        <div>
          <label className="form-label">Subject</label>
          <div className="text-sm text-slate-300">Application: {job.title}</div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="form-label mb-0">Cover letter</label>
            <button
              onClick={regenerate}
              disabled={generating}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              {generating ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              {generating ? "Generating..." : "Regenerate"}
            </button>
          </div>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="form-textarea"
            rows={14}
            placeholder={generating ? "AI is writing your cover letter..." : "Write your cover letter..."}
          />
        </div>

        <div>
          <label className="form-label">CV attachment</label>
          <label className="outline-button cursor-pointer w-full justify-center">
            <Paperclip size={14} />
            {cvName || "Attach CV"}
            <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
          </label>
        </div>

        {error && <div className="text-xs text-red-400">{error}</div>}
      </div>
    </div>
  );
}
