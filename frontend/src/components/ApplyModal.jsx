import React, { useState } from "react";
import { X, Send, Paperclip } from "lucide-react";
import api from "../api/axios";

function ApplyModal({ job, onClose, onApplied }) {
  const [message, setMessage] = useState("");
  const [cvFile, setCvFile] = useState(null);
  const [cvName, setCvName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCvName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => setCvFile(reader.result);
    reader.readAsDataURL(file);
  };

  const handleApply = async () => {
    if (!message.trim()) {
      setError("Please write a message to apply.");
      return;
    }
    api.post(`/jobs/${job._id}/apply`, { message, cvAttachment: cvFile })
      .then(res => { onApplied?.(res.data.application); })
      .catch(err => { console.warn("Apply failed:", err.message); });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Apply to {job.title}</h2>
          <button onClick={onClose} className="icon-button"><X size={18} /></button>
        </div>
        <div className="text-xs text-slate-500 mb-3">{job.company} · {job.location}</div>

        <label className="form-label">Your message</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          className="form-textarea"
          rows={6}
          placeholder="Dear Hiring Manager, I am writing to apply for this position..."
        />

        <div className="mt-4">
          <label className="form-label">Attach CV (optional)</label>
          <label className="outline-button cursor-pointer w-full justify-center">
            <Paperclip size={16} />
            {cvName || "Choose File"}
            <input type="file" accept=".pdf,.doc,.docx,image/*" onChange={handleFileChange} className="hidden" />
          </label>
        </div>

        {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
        {success ? (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400">
            Application submitted! ✅
          </div>
        ) : (
          <button onClick={handleApply} disabled={submitting} className="primary-button w-full mt-4">
            {submitting ? "Submitting..." : "Submit Application"}
            {!submitting && <Send size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}
export default ApplyModal;
