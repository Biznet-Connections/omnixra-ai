import React from "react";
import { X, Mail, Sparkles, Zap, Users } from "lucide-react";
import { hasTier } from "../utils/tierHelpers";
import { useAuth } from "../context/AuthContext";

export default function ApplyMethodModal({ job, applicantCount = 0, onClose, onPickGmail, onPickOmnixra, onPickAuto, onLocked }) {
  const { user } = useAuth();
  const isStarter = hasTier(user, "starter");

  const handlePremium = (cb) => {
    if (!isStarter) {
      onLocked?.();
      return;
    }
    cb?.();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold">Apply: {job.title}</h2>
            <div className="text-xs text-slate-500 mt-0.5">{job.company}</div>
          </div>
          <button onClick={onClose} className="icon-button"><X size={18} /></button>
        </div>

        {applicantCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-4">
            <Users size={14} />
            <span><strong>{applicantCount.toLocaleString()}</strong> candidates applied this week</span>
          </div>
        )}

        <div className="text-xs text-slate-400 mb-3">How do you want to apply?</div>

        <div className="space-y-3">
          {/* Gmail — Free */}
          <button
            onClick={onPickGmail}
            className="w-full p-3 rounded-xl border border-white/[.06] bg-white/[.02] hover:border-white/[.15] text-left"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Mail size={16} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Send via Gmail</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">FREE</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Opens Gmail with everything pre-filled. You hit send.
                </div>
              </div>
            </div>
          </button>

          {/* Omnixra — Starter+ */}
          <button
            onClick={() => handlePremium(onPickOmnixra)}
            className={`w-full p-3 rounded-xl border text-left ${
              isStarter
                ? "border-indigo-500/40 bg-indigo-500/[.04] hover:border-indigo-500/60"
                : "border-white/[.06] bg-white/[.02] hover:border-white/[.15]"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                <Sparkles size={16} className="text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Send via Omnixra</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                    {isStarter ? "STARTER+" : "🔒 STARTER+"}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  AI writes your cover letter, sends it, tracks it.
                </div>
              </div>
            </div>
          </button>

          {/* Auto Apply — Starter+ */}
          <button
            onClick={() => handlePremium(onPickAuto)}
            className={`w-full p-3 rounded-xl border text-left ${
              isStarter
                ? "border-purple-500/40 bg-purple-500/[.04] hover:border-purple-500/60"
                : "border-white/[.06] bg-white/[.02] hover:border-white/[.15]"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Zap size={16} className="text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Auto Apply</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                    {isStarter ? "STARTER+" : "🔒 STARTER+"}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  AI does everything. You just tap once.
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
