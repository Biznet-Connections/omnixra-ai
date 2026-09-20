import React, { useState } from "react";
import { ArrowLeft, Sparkles, Zap, CheckCircle, MessageCircle, Rocket, Star } from "lucide-react";
import PaymentModal from "../components/PaymentModal";

const PRODUCTS = [
  {
    key: "bundle_ai_10",
    icon: Sparkles,
    title: "10 AI Matches",
    price: 20,
    period: "one-time",
    badge: "SAVE 60%",
    highlight: true,
    features: ["Top 10 candidates per job", "$2 per match", "AI ranks by fit"],
  },
  {
    key: "ai_matching",
    icon: Sparkles,
    title: "Single AI Match",
    price: 5,
    period: "per job",
    features: ["Top 10 candidates", "AI + profile analysis", "Ranked by match score"],
  },
  {
    key: "priority_listing",
    icon: Zap,
    title: "Priority Listing",
    price: 2,
    period: "per job · 7 days",
    features: ["Featured at top of feed", "🔥 FEATURED badge", "3x more views"],
  },
  {
    key: "verified_badge_monthly",
    icon: CheckCircle,
    title: "Verified Badge",
    price: 15,
    period: "per month",
    features: ["Blue verified checkmark", "Build instant trust", "3x more applicants"],
  },
  {
    key: "direct_message",
    icon: MessageCircle,
    title: "Direct Message",
    price: 1,
    period: "per message",
    features: ["DM any jobseeker", "Skip the application queue", "Instant replies"],
  },
  {
    key: "company_boost_monthly",
    icon: Rocket,
    title: "Company Boost",
    price: 5,
    period: "per month",
    features: ["Featured on Companies page", "Appear first in search", "More visibility"],
  },
];

export default function CompanyPricingPage({ setPage }) {
  const [activePlan, setActivePlan] = useState(null);

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button onClick={() => setPage("home")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="text-center mb-6">
          <Star size={32} className="mx-auto text-amber-400 mb-2" />
          <h1 className="text-2xl font-bold mb-1 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Power Tools for Hiring
          </h1>
          <p className="text-sm text-slate-500">Pay as you go. No subscriptions required.</p>
        </div>

        <div className="space-y-3">
          {PRODUCTS.map(p => {
            const Icon = p.icon;
            return (
              <div
                key={p.key}
                className={`rounded-2xl border p-4 ${
                  p.highlight
                    ? "border-amber-500/40 bg-amber-500/[.04]"
                    : "border-white/[.06] bg-white/[.02]"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${p.highlight ? "bg-amber-500/15" : "bg-indigo-500/15"}`}>
                      <Icon size={18} className={p.highlight ? "text-amber-400" : "text-indigo-400"} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{p.title}</span>
                        {p.badge && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        ${p.price} / {p.period}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 mb-3">
                  {p.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-400">
                      <CheckCircle size={11} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setActivePlan(p.key)}
                  className={p.highlight ? "primary-button w-full" : "secondary-button w-full justify-center"}
                >
                  Buy for ${p.price}
                </button>
              </div>
            );
          })}
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
