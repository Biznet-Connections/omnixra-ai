import React from "react";
import { X, Briefcase, Megaphone, Rocket } from "lucide-react";

export default function PostChooserModal({ onClose, onPickJob, onPickUpdate, onPickBoost }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold">What do you want to post?</h2>
          <button onClick={onClose} className="icon-button"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          <button onClick={onPickJob} className="w-full p-4 rounded-xl border border-indigo-500/40 bg-indigo-500/[.04] text-left hover:border-indigo-500/60">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                <Briefcase size={18} className="text-indigo-400" />
              </div>
              <div>
                <div className="font-semibold text-sm flex items-center gap-2">
                  Post a Job
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">FREE</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Reach thousands of jobseekers in Zimbabwe
                </div>
              </div>
            </div>
          </button>

          <button onClick={onPickUpdate} className="w-full p-4 rounded-xl border border-white/[.06] bg-white/[.02] text-left hover:border-white/[.15]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                <Megaphone size={18} className="text-purple-400" />
              </div>
              <div>
                <div className="font-semibold text-sm flex items-center gap-2">
                  Share an Update
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">FREE</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Post news, culture, or announcements
                </div>
              </div>
            </div>
          </button>

          <button onClick={onPickBoost} className="w-full p-4 rounded-xl border border-white/[.06] bg-white/[.02] text-left hover:border-white/[.15]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                <Rocket size={18} className="text-amber-400" />
              </div>
              <div>
                <div className="font-semibold text-sm flex items-center gap-2">
                  Boost a Post
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">PAID</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Amplify any post to 20,000 or 80,000 people
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
