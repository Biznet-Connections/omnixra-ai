import React, { useState } from "react";
import PaymentModal from "../components/PaymentModal";
import { Crown, Check, Rocket } from "lucide-react";
import { PLANS } from "../utils/planConfig";

export default function PremiumPage() {
  const [activePlan, setActivePlan] = useState(null);

  return (
    <div className="max-w-3xl mx-auto p-4 text-white">
      <div className="text-center mb-6">
        <Crown size={32} className="mx-auto text-amber-400 mb-2" />
        <h1 className="text-2xl font-bold mb-1 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Upgrade Omnixra
        </h1>
        <p className="text-white/60 text-sm">Unlock power tools for your job search.</p>
      </div>

      <div className="space-y-4">
        {PLANS.map(t => (
          <div
            key={t.key}
            className={`rounded-2xl border p-4 ${
              t.highlight ? "border-amber-500/40 bg-amber-500/[.04]" : "border-white/10 bg-white/5"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{t.name}</h3>
                  {t.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                      {t.badge}
                    </span>
                  )}
                </div>
                <div className="text-3xl font-bold mt-1">
                  {t.price}
                  <span className="text-sm text-white/50 ml-1">/ {t.period}</span>
                </div>
                {t.tagline && <div className="text-xs text-indigo-300/70 mt-1 italic">{t.tagline}</div>}
              </div>
            </div>

            <div className="space-y-1.5 mb-4">
              {t.features.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-white/70">
                  <Check size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
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

        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Rocket size={16} className="text-indigo-400" />
            <h3 className="font-semibold text-sm">One-time boosts</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setActivePlan("boost_20k")}
              className="rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:border-white/20"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">20,000 reach</span>
                <span className="font-bold text-indigo-400">$2</span>
              </div>
            </button>
            <button
              onClick={() => setActivePlan("boost_80k")}
              className="rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:border-white/20"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">80,000 reach ★</span>
                <span className="font-bold text-indigo-400">$5</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {activePlan && (
        <PaymentModal
          planKey={activePlan}
          onClose={() => setActivePlan(null)}
          onSuccess={() => setActivePlan(null)}
        />
      )}
    </div>
  );
}
