import React, { useState, useEffect, useRef } from "react";
import api from "../api/axios";
import { X, CheckCircle, XCircle, Loader2 } from "lucide-react";

const PLANS = {
  boost_20k:       { label: "Boost Post - 20,000 reach", amount: 2 },
  boost_80k:       { label: "Boost Post - 80,000 reach", amount: 5 },
  push_cv:         { label: "Push CV to one company",     amount: 5 },
  premium_monthly: { label: "Premium - Monthly",          amount: 5 },
  premium_yearly:  { label: "Premium - Yearly",           amount: 45 },
};

const PROVIDERS = [
  { key: "ecocash",  label: "EcoCash" },
  { key: "innbucks", label: "InnBucks" },
  { key: "onemoney", label: "OneMoney" },
];

export default function PaymentModal({ planKey, metadata = {}, onClose, onSuccess }) {
  const [step, setStep] = useState("form");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState("ecocash");
  const [reference, setReference] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  const plan = PLANS[planKey];

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  if (!plan) return null;

  const submit = async () => {
    setError("");
    if (!/^07\d{8}$/.test(phone.trim())) {
      setError("Enter phone like 0771234567");
      return;
    }
    try {
      const res = await api.post("/payments/initiate", {
        planKey, phone: phone.trim(), method, metadata,
      });
      setReference(res.data.reference);
      setStep("waiting");

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
        } catch (e) {}
      }, 3000);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#0f0f1e] border border-white/10 p-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{plan.label}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        {step === "form" && (
          <>
            <div className="text-3xl font-bold mb-4">${plan.amount}<span className="text-sm text-white/60 ml-1">USD</span></div>

            <label className="block text-sm text-white/70 mb-1">Payment method</label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {PROVIDERS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setMethod(p.key)}
                  className={"py-2 rounded-lg text-sm border " + (method === p.key ? "bg-indigo-600 border-indigo-500" : "bg-white/5 border-white/10")}
                >{p.label}</button>
              ))}
            </div>

            <label className="block text-sm text-white/70 mb-1">Phone number</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="0771234567"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 mb-4 outline-none focus:border-indigo-500"
            />

            {error && <div className="text-red-400 text-sm mb-3">{error}</div>}

            <button
              onClick={submit}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 font-semibold"
            >
              Pay ${plan.amount}
            </button>
          </>
        )}

        {step === "waiting" && (
          <div className="text-center py-6">
            <Loader2 className="mx-auto animate-spin mb-3" size={40} />
            <p className="text-white/80">Check your phone and approve the USSD prompt.</p>
            <p className="text-xs text-white/50 mt-2">Reference: {reference}</p>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-6">
            <CheckCircle className="mx-auto text-green-400 mb-3" size={48} />
            <p className="font-semibold">Payment confirmed</p>
            <button onClick={onClose} className="mt-4 px-6 py-2 rounded-lg bg-white/10">Close</button>
          </div>
        )}

        {step === "failed" && (
          <div className="text-center py-6">
            <XCircle className="mx-auto text-red-400 mb-3" size={48} />
            <p className="text-white/80">{message}</p>
            <button onClick={() => setStep("form")} className="mt-4 px-6 py-2 rounded-lg bg-white/10">Try again</button>
          </div>
        )}
      </div>
    </div>
  );
}
