import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import PaymentModal from "./PaymentModal";

const PLANS = [
  {
    key: "boost_job_starter",
    name: "Starter",
    tagline: "Move to position 1–10 within this queue",
    features: [
      "Priority in this HR inbox",
      "AI cover letters (unlimited)",
      "Auto-apply to matching jobs",
    ],
    price: 5,
    duration: "3 days",
  },
  {
    key: "boost_job_plus",
    name: "Plus",
    tagline: "Move to position 1–10 + direct HR contact",
    inherited: "Everything in Starter, plus:",
    features: [
      "Message HR directly",
      "Companies see you first",
      "Send profile to companies",
    ],
    price: 10,
    duration: "7 days",
  },
  {
    key: "boost_job_pro",
    name: "Pro",
    subline: "For serious candidates",
    tagline: "Move to position 1–10 + verified profile + instant alerts",
    inherited: "Everything in Plus, plus:",
    features: [
      "Verified badge",
      "Instant job alerts",
      "Priority support",
      "Free boosts on future jobs",
    ],
    price: 25,
    duration: "30 days",
  },
];

export default function BoostPlansScreen({ rank, total, jobTitle, company, onClose, onChoosePlan }) {
  const [payingPlan, setPayingPlan] = useState(null);

  return (
    <div className="boost-screen">
      <div className="boost-header">
        <button onClick={onClose} className="icon-button"><ArrowLeft size={18} /></button>
        <div className="boost-header-text">
          <div className="boost-header-title">Move me to the front</div>
          <div className="boost-header-sub">Choose how you want to be positioned</div>
        </div>
      </div>

      <div className="boost-scroll">
        {/* Anchor */}
        <div className="boost-anchor">
          <div className="boost-anchor-job">{jobTitle}</div>
          <div className="boost-anchor-company">{company}</div>
          <div className="boost-anchor-position">
            You are <strong>{rank}th</strong> in this queue
          </div>
        </div>

        {/* Plans */}
        <div className="boost-plans">
          {PLANS.map((p) => (
            <div key={p.key} className="boost-plan">
              <div className="boost-plan-head">
                <div className="boost-plan-name">
                  {p.name}
                  {p.subline && <span className="boost-plan-subline"> · {p.subline}</span>}
                </div>
                <div className="boost-plan-price">
                  <span className="boost-plan-price-amount">${p.price}</span>
                  <span className="boost-plan-price-duration">· valid for {p.duration}</span>
                </div>
              </div>

              <div className="boost-plan-tagline">{p.tagline}</div>

              <div className="boost-plan-divider" />

              {p.inherited && <div className="boost-plan-inherited">{p.inherited}</div>}
              <ul className="boost-plan-list">
                {p.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>

              <button
                className={`boost-plan-select ${p.key === "pro" ? "boost-plan-select-primary" : ""}`}
                onClick={() => setPayingPlan(p.key)}
              >
                Select {p.name}
              </button>
            </div>
          ))}
        </div>

        <div className="boost-footer">
          Cancel anytime. Boost applies to this application immediately.
        </div>
      </div>

      {payingPlan && (
        <PaymentModal
          planKey={payingPlan}
          onClose={() => setPayingPlan(null)}
          onSuccess={() => {
            const plan = payingPlan;
            setPayingPlan(null);
            onChoosePlan?.(plan);
          }}
        />
      )}
    </div>
  );
}
