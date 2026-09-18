import React, { useState } from "react";
import { X, FileText } from "lucide-react";
import api from "../api/axios";
import ProgressModal from "./ProgressModal";
import SuccessModal from "./SuccessModal";

export default function PushCVModal({ job, onClose, onPushAnother }) {
  const [note, setNote] = useState("");
  const [step, setStep] = useState("form");
  const [error, setError] = useState("");

  const handlePush = async () => {
    setError("");
    setStep("loading");
    try {
      await api.post(`/jobs/${job._id}/push-cv`, { note });
      setTimeout(() => setStep("success"), 700);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
      setStep("form");
    }
  };

  if (step === "loading") {
    return (
      <ProgressModal
        title="Pushing your CV..."
        steps={[
          { label: "CV attached", status: "done" },
          { label: note ? "Cover note added" : "Cover note skipped", status: "done" },
          { label: `Sending to ${job.company}`, status: "active" },
        ]}
      />
    );
  }

  if (step === "success") {
    return (
      <SuccessModal
        title="CV pushed!"
        message={`Delivered to ${job.company}. You are now at the top of the hiring pile.`}
        primaryLabel="Push to another job"
        onPrimary={() => { onClose(); onPushAnother && onPushAnother(); }}
        secondaryLabel="Done"
        onSecondary={onClose}
      />
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold">Push your CV</h2>
            <div className="text-xs text-slate-500 mt-0.5 truncate">
              {job.title} - {job.company}
            </div>
          </div>
          <button onClick={onClose} className="icon-button flex-shrink-0"><X size={18} /></button>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-white/[.02] border border-white/[.06] mb-4">
          <FileText size={16} className="text-indigo-400" />
          <span className="text-xs text-slate-400">CV attached</span>
        </div>

        <label className="form-label">Optional note ({note.length}/100)</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value.slice(0, 100))}
          className="form-textarea"
          rows={3}
          placeholder="I'm very interested in this role..."
        />

        {error && <div className="text-xs text-red-400 mt-2">{error}</div>}

        <button onClick={handlePush} className="primary-button w-full mt-4">
          Push CV
        </button>
      </div>
    </div>
  );
}
