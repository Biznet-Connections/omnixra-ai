import React, { useState } from "react";
import { X, Crown, Check } from "lucide-react";
import PaymentModal from "./PaymentModal";
import { PLANS } from "../utils/planConfig";

/**
 * mode: "hr-reply" | "inbox-hr" | undefined (default = generic)
 * reason: short string shown in title
 */
function getCopyFor(mode) {
  if (mode === "hr-reply") {
    return {
      title: "Unlock replies to companies",
      subtitle: "Reply to the companies that messaged you.",
      plans: {
        starter: {
          tagline: "Reply to 1 company per day",
          features: [
            "Send up to 3 replies total",
            "Basic replies (text only)",
            "Works for 3 days",
          ],
        },
        plus: {
          tagline: "Reply to unlimited companies",
          features: [
            "Reply to every company that messages you — no limits",
            "Attach CV / portfolio in replies",
            "See when HR has read your reply",
            "Works for 7 days",
          ],
        },
        pro: {
          tagline: "Priority HR inbox placement",
          features: [
            "Everything in Plus",
            "Your replies appear at TOP of the company's inbox",
            "\"Serious candidate\" badge on every reply",
            "Works for 30 days",
          ],
        },
      },
      socialProof: "142 job seekers unlocked this week",
    };
  }
  if (mode === "inbox-hr") {
    return {
      title: "Message HR directly",
      subtitle: "Skip the queue and reach companies directly.",
      plans: {
        starter: {
          tagline: "Message 1 company per day",
          features: [
            "Send up to 3 direct messages total",
            "Text only",
            "Works for 3 days",
          ],
        },
        plus: {
          tagline: "Message any company, any time",
          features: [
            "Unlimited direct messages to companies",
            "Attach your CV to messages",
            "See when HR has read your message",
            "Works for 7 days",
          ],
        },
        pro: {
          tagline: "Priority HR inbox",
          features: [
            "Everything in Plus",
            "Your messages land at TOP of HR inbox",
            "\"Serious candidate\" badge",
            "Works for 30 days",
          ],
        },
      },
      socialProof: "142 job seekers unlocked this week",
    };
  }
  // default
  return {
    title: "Omnixra Premium",
    subtitle: "Unlock power tools for your job search.",
    plans: null,
    socialProof: null,
  };
}

function mapPlanKey(planKey) {
  // PLANS uses keys like "starter_biweekly" / "plus_biweekly" / "pro_monthly"
  if (planKey?.startsWith("starter")) return "starter";
  if (planKey?.startsWith("plus")) return "plus";
  if (planKey?.startsWith("pro")) return "pro";
  return null;
}

function PremiumModal({ onClose, reason, mode }) {
  const [activePlan, setActivePlan] = useState(null);
  const copy = getCopyFor(mode);

  if (activePlan) {
    return (
      <PaymentModal
        planKey={activePlan}
        onClose={() => { setActivePlan(null); onClose(); }}
        onSuccess={() => { setActivePlan(null); onClose(); }}
      />
    );
  }

  const title = reason ? `Unlock ${reason}` : copy.title;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box premium-modal-box" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Crown size={20} className="text-amber-400" />
            {title}
          </h2>
          <button onClick={onClose} className="icon-button"><X size={18} /></button>
        </div>

        <p className="text-xs text-slate-500 mb-4">{copy.subtitle}</p>

        <div className="space-y-3">
          {PLANS.map(t => {
            const tierKey = mapPlanKey(t.key);
            const override = copy.plans && tierKey ? copy.plans[tierKey] : null;
            const features = override?.features || t.features;
            const tagline = override?.tagline || t.tagline;

            return (
              <div
                key={t.key}
                className={`premium-plan-card ${t.highlight ? "highlight" : ""}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base">{t.name}</h3>
                      {t.badge && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                          {t.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-bold mt-1">
                      {t.price}
                      <span className="text-xs text-white/50 ml-1">/ {t.period}</span>
                    </div>
                    {tagline && (
                      <div className="text-xs text-indigo-300/80 mt-1 italic">
                        {tagline}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 mb-3">
                  {features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-white/75">
                      <Check size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setActivePlan(t.key)}
                  className={t.highlight ? "primary-button w-full justify-center" : "secondary-button w-full justify-center"}
                >
                  {t.highlight ? `Choose ${t.name} →` : `Choose ${t.name}`}
                </button>
              </div>
            );
          })}
        </div>

        {copy.socialProof && (
          <div className="premium-modal-social">
            🔥 {copy.socialProof}
          </div>
        )}
      </div>
    </div>
  );
}

export default PremiumModal;
