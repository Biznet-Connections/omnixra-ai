import React, { useState, useEffect, useRef } from "react";
import api from "../api/axios";
import { X, CheckCircle, XCircle, Loader2, ShieldCheck, Smartphone, CreditCard, Wallet } from "lucide-react";

const PLANS = {
  starter_biweekly: {
    label: "Starter Plan",
    amount: 5,
    duration: "14 days",
    unlocks: ["Inbox HR", "Push My Profile"],
  },
  plus_biweekly: {
    label: "Plus Plan",
    amount: 10,
    duration: "14 days",
    unlocks: ["Inbox HR", "Push My Profile", "Higher visibility", "Advanced AI insights"],
  },
  pro_monthly: {
    label: "Pro Plan",
    amount: 25,
    duration: "30 days",
    unlocks: ["Everything in Plus", "Instant notifications", "Priority support", "Verified badge"],
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
};

export default function PaymentModal({ planKey, metadata = {}, onClose, onSuccess }) {
  const [step, setStep] = useState("confirm"); // confirm | opening | checking | success | failed
  const [reference, setReference] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [message, setMessage] = useState("");
  const pollRef = useRef(null);

  const plan = PLANS[planKey];

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  if (!plan) return null;

  const startPayment = async () => {
    setStep("opening");
    try {
      const res = await api.post("/payments/initiate", { planKey, metadata });
      setReference(res.data.reference);
      setCheckoutUrl(res.data.checkoutUrl);

      // Open Linkwa checkout in new tab
      window.open(res.data.checkoutUrl, "_blank");

      setStep("checking");

      // Poll our backend for status
      pollRef.current = setInterval(async () => {
        try {
          const s = await api.get("/payments/status/" + res.data.reference);
          if (s.data.status === "paid") {
            clearInterval(pollRef.current);
            setStep("success");
            onSuccess && onSuccess(s.data);
          } else if (s.data.status === "failed" || s.data.status === "cancelled") {
            clearInterval(pollRef.current);
            setMessage(s.data.message || "Payment failed");
            setStep("failed");
          }
        } catch (e) { /* keep polling */ }
      }, 4000);
    } catch (e) {
      setMessage(e?.response?.data?.message || e.message);
      setStep("failed");
    }
  };

  return (
    <div className="modal-backdrop" onClick={step === "confirm" ? onClose : undefined}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{plan.label}</h2>
          {step === "confirm" && (
            <button onClick={onClose} className="icon-button"><X size={18} /></button>
          )}
        </div>

        {step === "confirm" && (
          <>
            <div className="text-3xl font-bold mb-1">${plan.amount}</div>
            <div className="text-xs text-slate-500 mb-5">USD - {plan.duration}</div>

            <div className="mb-5">
              <div className="text-xs text-slate-500 mb-2">You unlock:</div>
              {plan.unlocks.map((u, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-300 mb-1">
                  <CheckCircle size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>{u}</span>
                </div>
              ))}
            </div>

            <div className="mb-5 p-3 rounded-lg border border-white/[.06] bg-white/[.02]">
              <div className="text-xs text-slate-500 mb-2">Pay securely with:</div>
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1"><Smartphone size={11}/> EcoCash</span>
                <span className="flex items-center gap-1"><Smartphone size={11}/> InnBucks</span>
                <span className="flex items-center gap-1"><Smartphone size={11}/> OneMoney</span>
                <span className="flex items-center gap-1"><Wallet size={11}/> Omari</span>
                <span className="flex items-center gap-1"><Wallet size={11}/> SmileCash</span>
                <span className="flex items-center gap-1"><CreditCard size={11}/> Visa</span>
                <span className="flex items-center gap-1"><CreditCard size={11}/> Mastercard</span>
              </div>
            </div>

            <button onClick={startPayment} className="primary-button w-full">
              Continue to checkout →
            </button>

            <div className="flex items-center justify-center gap-1.5 mt-3 text-[10px] text-slate-600">
              <ShieldCheck size={11} /> Secured by Linkwa
            </div>
          </>
        )}

        {step === "opening" && (
          <div className="text-center py-6">
            <Loader2 className="mx-auto animate-spin text-indigo-400 mb-3" size={40} />
            <p className="text-sm text-slate-400">Preparing checkout...</p>
          </div>
        )}

        {step === "checking" && (
          <div className="text-center py-6">
            <Loader2 className="mx-auto animate-spin text-indigo-400 mb-3" size={40} />
            <p className="font-semibold">Complete payment in the new tab</p>
            <p className="text-xs text-slate-500 mt-2">
              This window will update automatically once paid.
            </p>
            {checkoutUrl && (
              <a href={checkoutUrl} target="_blank" rel="noreferrer"
                 className="secondary-button mt-4 inline-flex justify-center">
                Reopen checkout
              </a>
            )}
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-6">
            <CheckCircle className="mx-auto text-emerald-400 mb-3" size={48} />
            <p className="font-semibold">Payment confirmed</p>
            <p className="text-xs text-slate-500 mt-1">Your features are now active.</p>
            <button onClick={onClose} className="primary-button w-full mt-4">Done</button>
          </div>
        )}

        {step === "failed" && (
          <div className="text-center py-6">
            <XCircle className="mx-auto text-red-400 mb-3" size={48} />
            <p className="text-sm text-slate-400">{message}</p>
            <button onClick={() => setStep("confirm")} className="primary-button w-full mt-4">Try again</button>
          </div>
        )}

      </div>
    </div>
  );
}
