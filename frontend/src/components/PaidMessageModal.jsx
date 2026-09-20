import React, { useState } from "react";
import { X, MessageCircle, CheckCircle, Lock, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import PaymentModal from "./PaymentModal";

export default function PaidMessageModal({ targetUser, onClose, onOpenChat }) {
  const { user } = useAuth();
  const [step, setStep] = useState("intro"); // intro | no-credits | sending | success
  const [error, setError] = useState("");
  const [creditsLeft, setCreditsLeft] = useState(user?.dmCredits || 0);
  const [showPayment, setShowPayment] = useState(false);

  const send = async () => {
    setStep("sending");
    setError("");
    try {
      const res = await api.post("/messages/paid", { otherUserId: targetUser._id });
      setCreditsLeft(res.data.creditsLeft);
      setStep("success");
      setTimeout(() => {
        onOpenChat?.(res.data.conversationId);
        onClose();
      }, 1200);
    } catch (e) {
      if (e?.response?.status === 402) {
        setStep("no-credits");
      } else {
        setError(e?.response?.data?.message || e.message);
        setStep("intro");
      }
    }
  };

  if (showPayment) {
    return (
      <PaymentModal
        planKey="direct_message"
        onClose={() => setShowPayment(false)}
        onSuccess={() => { setShowPayment(false); setCreditsLeft(prev => prev + 1); setStep("intro"); }}
      />
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <MessageCircle size={16} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold">Send Direct Message</h2>
              <div className="text-[10px] text-slate-500">to {targetUser?.name}</div>
            </div>
          </div>
          <button onClick={onClose} className="icon-button"><X size={18} /></button>
        </div>

        {step === "intro" && (
          <>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Send a direct message to this jobseeker. They'll see it in their inbox.
            </p>

            <div className="rounded-xl border border-white/[.06] bg-white/[.02] p-3 mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Cost</span>
                <span className="font-bold">$1 per message</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Your credits</span>
                <span className="font-bold">{creditsLeft}</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 mb-4 flex items-start gap-1.5">
              <Sparkles size={11} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>Free if they've already applied to one of your jobs</span>
            </div>

            {error && <div className="text-xs text-red-400 mb-3">{error}</div>}

            {creditsLeft > 0 ? (
              <button onClick={send} className="primary-button w-full">
                Send message — $1
              </button>
            ) : (
              <button onClick={() => setShowPayment(true)} className="primary-button w-full">
                Buy a Direct Message credit — $1
              </button>
            )}
          </>
        )}

        {step === "no-credits" && (
          <>
            <div className="text-center mb-5">
              <Lock className="mx-auto text-amber-400 mb-3" size={40} />
              <h3 className="font-bold mb-1">Out of DM credits</h3>
              <p className="text-xs text-slate-500">Buy a $1 credit to message this person.</p>
            </div>
            <button onClick={() => setShowPayment(true)} className="primary-button w-full">
              Buy 1 credit — $1
            </button>
          </>
        )}

        {step === "sending" && (
          <div className="text-center py-6">
            <MessageCircle className="mx-auto text-indigo-400 mb-3 animate-pulse" size={40} />
            <p className="text-sm text-slate-400">Opening chat...</p>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-6">
            <CheckCircle className="mx-auto text-emerald-400 mb-3" size={48} />
            <p className="font-semibold">Message sent!</p>
            <p className="text-xs text-slate-500 mt-1">{creditsLeft} credits left</p>
          </div>
        )}
      </div>

    </div>
  );
}
