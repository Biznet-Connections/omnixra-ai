import React from "react";
import { X, Lock, Check } from "lucide-react";

const TIERS = [
  {
    key: "starter_biweekly",
    name: "Starter",
    price: "$5",
    period: "2 weeks",
    features: ["Inbox HR", "Push My Profile", "Push CV", "Apply via Omnixra", "Auto Apply"],
  },
  {
    key: "plus_biweekly",
    name: "Plus",
    price: "$10",
    period: "2 weeks",
    features: ["Everything in Starter", "Higher visibility", "Advanced AI insights"],
  },
  {
    key: "pro_monthly",
    name: "Pro",
    price: "$25",
    period: "month",
    badge: "BEST",
    highlight: true,
    features: ["Everything in Plus", "Instant notifications", "Priority support", "Verified badge"],
  },
];

export default function LockedFeatureModal({ featureName = "This feature", description, onClose, onChoosePlan, onSeePricing }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Lock size={16} className="text-amber-400" />
            </div>
            <h2 className="text-base font-bold">{featureName} is Premium</h2>
          </div>
          <button onClick={onClose} className="icon-button"><X size={18} /></button>
        </div>

        {description && (
          <p className="text-xs text-slate-400 mb-4">{description}</p>
        )}

        <div className="space-y-3">
          {TIERS.map(t => (
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
                    <span className="font-bold text-white text-sm">{t.price}</span> / {t.period}
                  </div>
                </div>
              </div>

              <div className="space-y-1 mb-3">
                {t.features.slice(0, 3).map((f, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-400">
                    <Check size={11} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => onChoosePlan(t.key)}
                className={t.highlight ? "primary-button w-full" : "secondary-button w-full justify-center"}
              >
                {t.highlight ? "Go Pro →" : `Choose ${t.name}`}
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={onSeePricing || onClose}
          className="text-xs text-indigo-400 hover:text-indigo-300 mt-4 w-full text-center"
        >
          See full pricing →
        </button>
      </div>
    </div>
  );
}
