import React, { useState } from "react";
import { X, Zap, Check, ShieldCheck, Loader2 } from "lucide-react";
import api from "../api/axios";

const AVATAR_COLORS = ["#6366f1","#8b5cf6","#ec4899","#ef4444","#f59e0b","#10b981","#06b6d4","#3b82f6"];
function colorFor(name) {
  if (!name) return "#6366f1";
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function PushProfileModal({ company, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!company) return null;

  const initial = (company.name?.[0] || "?").toUpperCase();
  const bg = colorFor(company.name);

  const checkout = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await api.post("/payments/initiate", {
        planKey: "push_profile",
        metadata: { companyId: company._id, companyName: company.name },
      });
      const checkoutUrl = r.data?.checkoutUrl || r.data?.linkwaCheckoutUrl || r.data?.url;
      
      sessionStorage.setItem("omnixra_return_state", JSON.stringify({
        action: "push_profile",
        companyId: company._id,
        companyName: company.name,
        timestamp: Date.now()
      }));
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="pp-modal-icon"><Zap size={16} /></div>
            <div className="text-base font-bold text-white">Push My Profile</div>
          </div>
          <button onClick={onClose} className="icon-button"><X size={18} /></button>
        </div>

        <div className="pp-company-row">
          <div className="pp-company-avatar" style={{ background: bg }}>{initial}</div>
          <div>
            <div className="pp-company-name">{company.name}</div>
            {company.industry || company.location ? (
              <div className="pp-company-sub">
                {[company.industry, company.location].filter(Boolean).join(" · ")}
              </div>
            ) : null}
          </div>
        </div>

        <div className="pp-price-box">
          <div className="pp-price">$2</div>
          <div className="pp-price-sub">USD · one-time</div>
        </div>

        <div className="pp-benefits">
          <div className="pp-benefits-label">You unlock:</div>
          {[
            `Your profile jumps to top of ${company.name}'s candidate list for 7 days`,
            "A \"Featured\" tag next to your name",
            "Direct notification to their HR team",
          ].map((f, i) => (
            <div key={i} className="pp-benefit">
              <Check size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>{f}</span>
            </div>
          ))}
        </div>

        <div className="pp-methods-label">Pay securely with:</div>
        <div className="flex flex-wrap gap-2 mb-5">
          {["EcoCash","InnBucks","OneMoney","Omari","SmileCash","Visa","Mastercard"].map(m => (
            <span key={m} className="pp-method">{m}</span>
          ))}
        </div>

        {error ? <div className="text-xs text-red-400 mb-3">{error}</div> : null}

        <button
          className="primary-button w-full justify-center"
          disabled={loading}
          onClick={checkout}
        >
          {loading ? <Loader2 size={14} className="spin" /> : null}
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
