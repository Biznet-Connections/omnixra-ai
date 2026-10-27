import React, { useState } from "react";
import { CheckCircle, Search, Compass, Inbox, Bot, X, Zap, ShieldCheck } from "lucide-react";
import api from "../api/axios";

export default function ApplicantPositionScreen({ job, onSimilar, onInbox }) {
  const [showAutoPilot, setShowAutoPilot] = useState(false);
  const [autopilotLoading, setAutopilotLoading] = useState(null);

  const checkoutAutoPilot = async (planKey) => {
    setAutopilotLoading(planKey);
    try {
      const r = await api.post("/payments/initiate", { planKey });
      const url = r.data?.checkoutUrl || r.data?.linkwaCheckoutUrl || r.data?.url;
      if (!url) throw new Error("No checkout URL returned");
      window.location.href = url;
    } catch (e) {
      alert(e.response?.data?.message || e.message || "Failed to start checkout");
      setAutopilotLoading(null);
    }
  };

  return (
    <div className="pos-screen-wrapper">
      <div className="pos-center-content">
        <CheckCircle size={64} className="text-emerald-400 mx-auto mb-4" />
        <div className="pos-title">Application received</div>
        <div className="pos-job-title">{job?.title || "Job"}</div>
        <div className="pos-company">{job?.company || "Company"}</div>
      </div>

      <div className="pos-action-cards">
        {/* Option 1: Similar Jobs */}
        <button className="pos-action-card" onClick={onSimilar}>
          <div className="pos-action-icon"><Search size={18} /></div>
          <div className="pos-action-text">
            <div className="pos-action-title">Show me similar jobs</div>
            <div className="pos-action-sub">Find more roles like this</div>
          </div>
        </button>

        {/* Option 2: Auto-Pilot */}
        <button className="pos-action-card" onClick={() => setShowAutoPilot(true)}>
          <div className="pos-action-icon pos-action-icon-premium"><Bot size={18} /></div>
          <div className="pos-action-text">
            <div className="pos-action-title">
              Turn on Auto-Pilot
              <span className="pos-action-badge">PREMIUM</span>
            </div>
            <div className="pos-action-sub">We'll apply to jobs while you sleep</div>
          </div>
        </button>

        {/* Option 3: Inbox */}
        <button className="pos-action-card" onClick={onInbox}>
          <div className="pos-action-icon"><Inbox size={18} /></div>
          <div className="pos-action-text">
            <div className="pos-action-title">Check Inbox</div>
            <div className="pos-action-sub">See your applications</div>
          </div>
        </button>
      </div>

      {/* Auto-Pilot Paywall Modal */}
      {showAutoPilot && (
        <div className="modal-backdrop" onClick={() => setShowAutoPilot(false)}>
          <div className="auto-pilot-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowAutoPilot(false)}>
              <X size={18} />
            </button>
            <div className="auto-pilot-header">
              <Bot size={32} className="text-indigo-400 mb-2" />
              <h2>Turn on Auto-Pilot</h2>
              <p>Let Omnixra apply to jobs for you while you sleep.</p>
            </div>
            
            <div className="cv-pricing-tiers">
              {/* Tier 1: Starter */}
              <div className="cv-tier-card">
                <div className="cv-tier-head">
                  <span className="cv-tier-emoji">🚀</span>
                  <div className="flex-1">
                    <div className="cv-tier-name">Starter</div>
                    <div className="cv-tier-price" style={{ color: "#0ea5e9" }}>$2.99 / week</div>
                  </div>
                </div>
                <div className="cv-tier-features">
                  <div className="cv-tier-feat"><CheckCircle size={12} className="text-emerald-400" /><span>10 auto-applies per week</span></div>
                  <div className="cv-tier-feat"><CheckCircle size={12} className="text-emerald-400" /><span>Standard matching</span></div>
                </div>
                <button className="cv-tier-btn" style={{ background: "#0ea5e9" }} onClick={() => checkoutAutoPilot("auto_starter")} disabled={autopilotLoading === "auto_starter"}>
                  {autopilotLoading === "auto_starter" ? "Redirecting…" : "Choose Starter"}</button>
              </div>

              {/* Tier 2: Plus */}
              <div className="cv-tier-card" style={{ borderColor: "rgba(168,85,247,0.3)" }}>
                <div className="cv-tier-head">
                  <span className="cv-tier-emoji">⭐</span>
                  <div className="flex-1">
                    <div className="cv-tier-name">Plus <span className="cv-tier-badge">POPULAR</span></div>
                    <div className="cv-tier-price" style={{ color: "#a855f7" }}>$7.99 / month</div>
                  </div>
                </div>
                <div className="cv-tier-features">
                  <div className="cv-tier-feat"><CheckCircle size={12} className="text-emerald-400" /><span>Unlimited auto-applies</span></div>
                  <div className="cv-tier-feat"><CheckCircle size={12} className="text-emerald-400" /><span>AI tailors cover letters</span></div>
                </div>
                <button className="cv-tier-btn" style={{ background: "#a855f7" }} onClick={() => checkoutAutoPilot("auto_plus")} disabled={autopilotLoading === "auto_plus"}>
                  {autopilotLoading === "auto_plus" ? "Redirecting…" : "Choose Plus"}</button>
              </div>

              {/* Tier 3: Pro */}
              <div className="cv-tier-card">
                <div className="cv-tier-head">
                  <span className="cv-tier-emoji">👑</span>
                  <div className="flex-1">
                    <div className="cv-tier-name">Pro Seeker</div>
                    <div className="cv-tier-price" style={{ color: "#f59e0b" }}>$14.99 / month</div>
                  </div>
                </div>
                <div className="cv-tier-features">
                  <div className="cv-tier-feat"><CheckCircle size={12} className="text-emerald-400" /><span>Unlimited auto-applies</span></div>
                  <div className="cv-tier-feat"><CheckCircle size={12} className="text-emerald-400" /><span>Priority AI matching</span></div>
                  <div className="cv-tier-feat"><CheckCircle size={12} className="text-emerald-400" /><span>Direct HR messaging</span></div>
                </div>
                <button className="cv-tier-btn" style={{ background: "#f59e0b" }} onClick={() => checkoutAutoPilot("auto_pro")} disabled={autopilotLoading === "auto_pro"}>
                  {autopilotLoading === "auto_pro" ? "Redirecting…" : "Go Pro"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
