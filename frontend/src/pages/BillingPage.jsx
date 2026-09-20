import React, { useEffect, useState } from "react";
import { ArrowLeft, CreditCard, CheckCircle, XCircle, Clock, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import LoadingDots from "../components/LoadingDots";

export default function BillingPage({ setPage }) {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/payments/my")
      .then(res => setPayments(res.data || []))
      .catch(e => console.warn("[billing] load failed:", e.message))
      .finally(() => setLoading(false));
  }, []);

  const totalPaid = payments.filter(p => p.status === "paid").reduce((sum, p) => sum + (p.amount || 0), 0);

  const statusColor = (status) => {
    if (status === "paid") return "text-emerald-400";
    if (status === "failed" || status === "cancelled") return "text-red-400";
    return "text-amber-400";
  };

  const statusIcon = (status) => {
    if (status === "paid") return <CheckCircle size={12} />;
    if (status === "failed" || status === "cancelled") return <XCircle size={12} />;
    return <Clock size={12} />;
  };

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button onClick={() => setPage("settings")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
          <ArrowLeft size={16} /> Back
        </button>

        <h1 className="page-title">Billing</h1>
        <p className="page-subtitle">Your payment history and subscription.</p>

        {/* Current subscription */}
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/[.04] p-4 mt-7">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Sparkles size={18} className="text-indigo-400" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-indigo-300 font-semibold uppercase tracking-wide">Current Plan</div>
              <div className="text-base font-bold">
                {user?.subscriptionTier && user.subscriptionTier !== "none"
                  ? user.subscriptionTier.charAt(0).toUpperCase() + user.subscriptionTier.slice(1)
                  : "Free"}
              </div>
              {user?.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date() && (
                <div className="text-[10px] text-slate-500">
                  Expires {new Date(user.subscriptionExpiresAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Total spent */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl border border-white/[.06] bg-white/[.02] p-3">
            <div className="text-[10px] text-slate-500">Total spent</div>
            <div className="text-xl font-bold mt-1">${totalPaid.toFixed(2)}</div>
          </div>
          <div className="rounded-xl border border-white/[.06] bg-white/[.02] p-3">
            <div className="text-[10px] text-slate-500">Transactions</div>
            <div className="text-xl font-bold mt-1">{payments.length}</div>
          </div>
        </div>

        {/* Payment history */}
        <div className="mt-6">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CreditCard size={14} /> Payment history
          </h2>

          {loading ? (
            <div className="flex justify-center mt-6"><LoadingDots /></div>
          ) : payments.length === 0 ? (
            <div className="rounded-xl border border-white/[.06] bg-white/[.02] p-6 text-center text-xs text-slate-500">
              No payments yet.
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map(p => (
                <div key={p._id} className="rounded-xl border border-white/[.06] bg-white/[.02] p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {p.plan?.replace(/_/g, " ") || p.type?.replace(/_/g, " ") || "Payment"}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Ref: {p.reference}
                      </div>
                      <div className="text-[10px] text-slate-600 mt-0.5">
                        {new Date(p.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <div className="text-sm font-bold">${p.amount}</div>
                      <div className={`text-[10px] flex items-center gap-1 justify-end ${statusColor(p.status)}`}>
                        {statusIcon(p.status)} {p.status}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
