import React, { useState } from "react";
import api from "../api/axios";
import { X, ShieldCheck, Smartphone, CreditCard, Wallet, Check } from "lucide-react";
import { getPlan, PLANS } from "../utils/planConfig";

// Non-subscription products (boost, AI matching, etc.)
const OTHER_PRODUCTS = {
  ai_matching: {
    label: "AI Candidate Matching",
    amount: 5,
    duration: "one job",
    unlocks: ["Top 10 ranked candidates", "AI analyzes all applicants + matches"],
  },
  bundle_ai_10: {
    label: "AI Matching Bundle (10)",
    amount: 20,
    duration: "10 jobs",
    unlocks: ["10 AI matches", "Save 60% vs single", "$2 per match"],
  },
  priority_listing: {
    label: "Priority Job Listing",
    amount: 2,
    duration: "7 days",
    unlocks: ["Featured at top of feed", "🔥 Featured badge"],
  },
  direct_message: {
    label: "Direct Message",
    amount: 1,
    duration: "1 message",
    unlocks: ["Message any jobseeker directly"],
  },
  verified_badge_monthly: {
    label: "Verified Badge",
    amount: 15,
    duration: "30 days",
    unlocks: ["Verified employer checkmark", "3x more trust"],
  },
  company_boost_monthly: {
    label: "Company Boost",
    amount: 5,
    duration: "30 days",
    unlocks: ["Featured on Companies page"],
  },
  boost_20k: {
    label: "Boost Post - 20,000 reach",
    amount: 2,
    duration: "7 days",
    unlocks: ["20,000 people will see your post"],
  },
  boost_80k: {
    label: "Boost Post - 80,000 reach",
    amount: 5,
    duration: "7 days",
    unlocks: ["80,000 people will see your post"],
  },
  boost_job_starter: {
    label: "Starter Boost",
    amount: 5,
    duration: "3 days",
    unlocks: ["Move to position 1–10", "AI cover letters (unlimited)", "Auto-apply to matching jobs"],
  },
};

function resolveProduct(planKey) {
  // Prefer subscription plans from planConfig
  const sub = getPlan(planKey);
  if (sub) {
    return {
      label: sub.name + " Plan",
      amount: sub.priceValue,
      duration: sub.period,
      unlocks: sub.features,
      isSubscription: true,
      tier: sub.tier,
    };
  }
  const other = OTHER_PRODUCTS[planKey];
  if (other) return { ...other, isSubscription: false };
  return null;
}

export default function PaymentModal({ planKey, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const product = resolveProduct(planKey);

  if (!product) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-box" onClick={e => e.stopPropagation()}>
          <div className="text-red-400 text-sm">Unknown plan: {planKey}</div>
          <button className="primary-button mt-4" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const handleCheckout = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await api.post("/payments/initiate", { planKey });
      const checkoutUrl = r.data?.checkoutUrl || r.data?.linkwaCheckoutUrl || r.data?.url;
      if (!checkoutUrl) throw new Error("No checkout URL returned");
      window.location.href = checkoutUrl;
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to start checkout");
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box premium-modal-box" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-lg font-bold text-white">{product.label}</div>
            <div className="text-xs text-slate-500 mt-0.5">{product.duration}</div>
          </div>
          <button onClick={onClose} className="icon-button"><X size={18} /></button>
        </div>

        <div className="text-3xl font-bold text-white mb-1">
          ${product.amount}
          <span className="text-sm text-white/50 ml-2">USD · {product.duration}</span>
        </div>

        <div className="my-5">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">
            You unlock:
          </div>
          <div className="space-y-1.5">
            {product.unlocks.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-white/75">
                <Check size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">
          Pay securely with:
        </div>
        <div className="flex flex-wrap gap-2 mb-5">
          {["EcoCash","InnBucks","OneMoney","Omari","SmileCash","Visa","Mastercard"].map(m => (
            <span key={m} className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-slate-300">
              {m}
            </span>
          ))}
        </div>

        {error ? (
          <div className="text-xs text-red-400 mb-3">{error}</div>
        ) : null}

        <button
          className="primary-button w-full justify-center"
          disabled={loading}
          onClick={handleCheckout}
        >
          {loading ? "Redirecting…" : "Continue to checkout →"}
        </button>

        <div className="premium-modal-social mt-4">
          <ShieldCheck size={13} className="inline mr-1" />
          Secured by Linkwa · PCI-DSS compliant
        </div>
      </div>
    </div>
  );
}
