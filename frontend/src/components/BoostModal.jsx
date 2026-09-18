import React, { useState } from "react";
import { X, Rocket } from "lucide-react";
import PaymentModal from "./PaymentModal";

function BoostModal({ post, onClose }) {
  const [activePlan, setActivePlan] = useState(null);

  if (activePlan) {
    return (
      <PaymentModal
        planKey={activePlan}
        metadata={{ postId: post?._id }}
        onClose={() => { setActivePlan(null); onClose(); }}
        onSuccess={() => { setActivePlan(null); onClose(); }}
      />
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Rocket size={20} className="text-indigo-400" />
            Boost this post
          </h2>
          <button onClick={onClose} className="icon-button"><X size={18} /></button>
        </div>

        <p className="text-sm text-slate-400 mb-4">Choose your reach:</p>

        <div className="space-y-3">
          <button
            onClick={() => setActivePlan("boost_20k")}
            className="w-full p-4 rounded-xl border border-white/[.06] bg-white/[.02] hover:border-white/[.15] text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">📊 20,000 reach</div>
                <div className="text-xs text-slate-500 mt-1">~2,000 extra views</div>
              </div>
              <div className="text-lg font-bold text-indigo-400">$2</div>
            </div>
          </button>

          <button
            onClick={() => setActivePlan("boost_80k")}
            className="w-full p-4 rounded-xl border border-amber-500/30 bg-amber-500/[.04] hover:border-amber-500/50 text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">📊 80,000 reach ⭐</div>
                <div className="text-xs text-slate-500 mt-1">~8,000 extra views · Best value</div>
              </div>
              <div className="text-lg font-bold text-indigo-400">$5</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default BoostModal;
