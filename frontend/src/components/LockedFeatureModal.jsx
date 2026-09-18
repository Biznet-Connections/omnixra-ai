import React from "react";
import { X, Lock, Check, Star } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { tierRank, tierLabel } from "../utils/tierHelpers";

import { PLANS as TIERS } from "../utils/planConfig";

export default function LockedFeatureModal({
  featureName = "This feature",
  requiredTier = "starter",
  description,
  onClose,
  onChoosePlan,
  onSeePricing,
}) {
  const { user } = useAuth();
  const currentRank = tierRank(user);
  const requiredRank = { starter: 1, plus: 2, pro: 3 }[requiredTier] || 1;
  const isUpgrade = currentRank > 0;

  // Free user: show all tiers at or above required
  // Paid user: show only the tiers they need to upgrade to
  const visibleTiers = isUpgrade
    ? TIERS.filter(t => (requiredRank === 1 ? true : { starter: 1, plus: 2, pro: 3 }[t.tier] >= requiredRank))
    : TIERS.filter(t => ({ starter: 1, plus: 2, pro: 3 }[t.tier] >= requiredRank));

  const needsPro = requiredRank === 3;
  const needsPlus = requiredRank === 2;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              {isUpgrade ? <Star size={16} className="text-amber-400" /> : <Lock size={16} className="text-amber-400" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold truncate">
                {featureName} {isUpgrade ? `needs ${requiredTier.toUpperCase()}` : "is Premium"}
              </h2>
              {isUpgrade && (
                <div className="text-xs text-slate-500 mt-0.5">
                  You're on {tierLabel(user)} Â· Upgrade to unlock
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="icon-button flex-shrink-0"><X size={18} /></button>
        </div>

        {description && <p className="text-xs text-slate-400 mb-4">{description}</p>}

        <div className="space-y-3">
          {visibleTiers.map(t => (
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
                {t.features.slice(0, 4).map((f, i) => (
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
                {t.highlight ? `Upgrade to ${t.name}` : `Choose ${t.name}`}
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={onSeePricing || onClose}
          className="text-xs text-indigo-400 hover:text-indigo-300 mt-4 w-full text-center"
        >
          See full pricing â†’
        </button>
      </div>
    </div>
  );
}
