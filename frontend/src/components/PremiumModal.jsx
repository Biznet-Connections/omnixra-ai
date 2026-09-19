import React, { useState } from "react";
import { X, Crown, Check } from "lucide-react";
import PaymentModal from "./PaymentModal";
import { PLANS } from "../utils/planConfig";

function PremiumModal({ onClose, reason }) {
  const [activePlan, setActivePlan] = useState(null);

  if (activePlan) {
    return (
      <PaymentModal
        planKey={activePlan}
        onClose={() => { setActivePlan(null); onClose(); }}
        onSuccess={() => { setActivePlan(null); onClose(); }}
      />
    );
  }

  const title = reason ? `Unlock ${reason}` : "Omnixra Premium";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Crown size={20} className="text-amber-400" />
            {title}
          </h2>
          <button onClick={onClose} className="icon-button"><X size={18} /></button>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          Unlock power tools for your job search.
        </p>

        <div className="space-y-3">
          {PLANS.map(t => (
            <div
              key={t.key}
              className={`p-3 rounded-xl border ${
                t.highlight
                  ? "border-amber-500/40 bg-amber-500/[.04]"
                  : "border-white/[.06] bg-white/[.02]"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{t.name}</span>
                    {t.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                        {t.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    <span className="font-bold text-white text-base">{t.price}</span> / {t.period}
                  </div>
                  {t.tagline && <div className="text-[10px] text-indigo-300/70 mt-0.5 italic">{t.tagline}</div>}
                </div>
              </div>

              <div className="space-y-1 mb-3">
                {t.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-400">
                    <Check size={11} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setActivePlan(t.key)}
                className={t.highlight ? "primary-button w-full" : "secondary-button w-full justify-center"}
              >
                {t.highlight ? "Go Pro →" : `Choose ${t.name}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PremiumModal;
