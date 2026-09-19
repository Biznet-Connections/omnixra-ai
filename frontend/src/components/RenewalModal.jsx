import React from "react";
import { X, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PLANS } from "../utils/planConfig";

export default function RenewalModal({ onClose, onChoosePlan, expiredTier }) {
  const { user } = useAuth();
  const tier = expiredTier || user?.subscriptionTier || "starter";
  const label = tier.charAt(0).toUpperCase() + tier.slice(1);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="flex justify-end">
          <button onClick={onClose} className="icon-button"><X size={18} /></button>
        </div>

        <div className="text-center mb-5">
          <Clock className="mx-auto text-amber-400 mb-3" size={48} />
          <h2 className="text-lg font-bold mb-2">Your {label} plan has expired</h2>
          <p className="text-xs text-slate-400">
            Renew to keep your premium features.
          </p>
        </div>

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
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-semibold text-sm">{t.name}</span>
                  {t.badge && (
                    <span className="text-[9px] px-1.5 py-0.5 ml-2 rounded bg-amber-500/20 text-amber-400 font-bold">
                      {t.badge}
                    </span>
                  )}
                </div>
                <span className="font-bold text-white">
                  {t.price} <span className="text-xs text-slate-500">/ {t.period}</span>
                </span>
              </div>
              <button
                onClick={() => onChoosePlan(t.key)}
                className={t.highlight ? "primary-button w-full" : "secondary-button w-full justify-center"}
              >
                Renew {t.name}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
