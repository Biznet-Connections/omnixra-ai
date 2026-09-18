import React from "react";
import { X, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { tierLabel } from "../utils/tierHelpers";

export default function RenewalModal({ onClose, onChoosePlan, expiredTier }) {
  const { user } = useAuth();
  const tier = expiredTier || user?.subscriptionTier || "starter";
  const label = tier.charAt(0).toUpperCase() + tier.slice(1);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box text-center" onClick={e => e.stopPropagation()}>
        <div className="flex justify-end">
          <button onClick={onClose} className="icon-button"><X size={18} /></button>
        </div>

        <Clock className="mx-auto text-amber-400 mb-3" size={48} />

        <h2 className="text-lg font-bold mb-2">Your {label} has expired</h2>
        <p className="text-xs text-slate-400 mb-6">
          Renew to keep your premium features.
        </p>

        <div className="space-y-3 text-left">
          <div className="p-3 rounded-xl border border-indigo-500/40 bg-indigo-500/[.04]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">Starter</span>
              <span className="font-bold text-white">$5</span>
            </div>
            <div className="text-xs text-slate-500 mb-2">Inbox HR · Push CV · Push Profile</div>
            <button onClick={() => onChoosePlan("starter_biweekly")} className="secondary-button w-full justify-center">
              Renew Starter
            </button>
          </div>

          <div className="p-3 rounded-xl border border-purple-500/40 bg-purple-500/[.04]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">Plus</span>
              <span className="font-bold text-white">$10</span>
            </div>
            <div className="text-xs text-slate-500 mb-2">+ Higher visibility + AI insights</div>
            <button onClick={() => onChoosePlan("plus_biweekly")} className="secondary-button w-full justify-center">
              Upgrade to Plus
            </button>
          </div>

          <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/[.04]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">Pro ⭐</span>
              <span className="font-bold text-white">$25</span>
            </div>
            <div className="text-xs text-slate-500 mb-2">Everything + notifications + badge</div>
            <button onClick={() => onChoosePlan("pro_monthly")} className="primary-button w-full">
              Go Pro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
