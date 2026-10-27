import React, { useState } from "react";
import { X, Sparkles, Check, Loader2 } from "lucide-react";
import api from "../api/axios";

const TIERS = [
  {
    key: "cv_one",
    name: "One-Time Boost",
    price: "$1.99",
    color: "#8b5cf6",
    emoji: "🟣",
    features: ["1 AI-generated CV", "Matches this specific job"],
    cta: "Generate CV",
  },
  {
    key: "cv_pack_10",
    name: "Job Hunter Pack",
    price: "$4.99",
    color: "#0ea5e9",
    emoji: "🔵",
    badge: "POPULAR",
    features: ["10 AI-generated CVs", "Customize for any job"],
    cta: "Get 10 CVs",
  },
  {
    key: "cv_monthly",
    name: "Pro Seeker",
    price: "$9.99/mo",
    color: "#f59e0b",
    emoji: "🟡",
    badge: "BEST",
    features: ["Unlimited AI CVs", "Unlimited AI Cover Letters", "Unlocks Auto-Pilot (3/day)"],
    cta: "Go Pro",
  },
];

export default function CVPricingModal({ onClose, onSuccess, job, draft }) {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState("");

  const checkout = async (tier) => {
    setLoading(tier.key);
    setError("");
    try {
      const r = await api.post("/payments/initiate", {
        planKey: tier.key,
        metadata: { source: "cv_builder" },
      });
      const url = r.data?.checkoutUrl || r.data?.linkwaCheckoutUrl;
      
      // Save the fact that they bought a CV, so we can auto-generate it when they return
      sessionStorage.setItem("omnixra_return_state", JSON.stringify({
        action: "cv_purchased",
        tier: tier.key,
        job: job,
        draft: draft,
        timestamp: Date.now()
      }));
      if (!url) throw new Error("No checkout URL");
      window.location.href = url;
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to start checkout");
      setLoading(null);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="cv-pricing-panel" onClick={e => e.stopPropagation()}>
        <div className="cv-pricing-header">
          <div className="cv-pricing-icon"><Sparkles size={18} /></div>
          <div className="flex-1">
            <div className="cv-pricing-title">Save Your CV</div>
            <div className="cv-pricing-sub">Choose how you want to download</div>
          </div>
          <button onClick={onClose} className="icon-button"><X size={18} /></button>
        </div>

        <div className="cv-pricing-tiers">
          {TIERS.map(tier => (
            <div key={tier.key} className="cv-tier-card">
              <div className="cv-tier-head">
                <span className="cv-tier-emoji">{tier.emoji}</span>
                <div className="flex-1">
                  <div className="cv-tier-name">
                    {tier.name}
                    {tier.badge && <span className="cv-tier-badge">{tier.badge}</span>}
                  </div>
                  <div className="cv-tier-price" style={{ color: tier.color }}>{tier.price}</div>
                </div>
              </div>

              <div className="cv-tier-features">
                {tier.features.map((f, i) => (
                  <div key={i} className="cv-tier-feat">
                    <Check size={12} className="text-emerald-400" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <button
                className="cv-tier-btn"
                style={{ background: tier.color }}
                disabled={loading === tier.key}
                onClick={() => checkout(tier)}
              >
                {loading === tier.key ? <Loader2 size={13} className="spin" /> : null}
                {loading === tier.key ? "Redirecting…" : tier.cta}
              </button>
            </div>
          ))}
        </div>

        {error ? <div className="text-xs text-red-400 text-center mt-3">{error}</div> : null}
      </div>
    </div>
  );
}
