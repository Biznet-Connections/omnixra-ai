import React, { useState } from "react";
import { X, Crown, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function PremiumModal({ onClose }) {
  const { user, redeemVoucher } = useAuth();
  const [voucherCode, setVoucherCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRedeem = async () => {
    setError("");
    try {
      const res = await api.post("/vouchers/redeem", { code: voucherCode });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid voucher code");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Crown size={20} className="text-amber-400" />
            Omnixra Premium
          </h2>
          <button onClick={onClose} className="icon-button"><X size={18} /></button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-2 text-sm text-slate-300">
            <Check size={16} className="text-emerald-400 mt-0.5" />
            <span>Inbox HR — contact companies directly and get noticed faster.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-300">
            <Check size={16} className="text-emerald-400 mt-0.5" />
            <span>Push My Profile — send your CV to company inboxes instantly.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-300">
            <Check size={16} className="text-emerald-400 mt-0.5" />
            <span>Higher visibility in company searches.</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-300">
            <Check size={16} className="text-emerald-400 mt-0.5" />
            <span>Advanced AI career insights.</span>
          </div>
        </div>

        {success ? (
          <div className="mt-5 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400">
            Voucher redeemed successfully! You now have premium access.
          </div>
        ) : (
          <>
            <div className="mt-5">
              <label className="form-label">Enter voucher code</label>
              <input
                value={voucherCode}
                onChange={e => setVoucherCode(e.target.value)}
                className="form-input"
                placeholder="ABC123"
              />
            </div>
            {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
            <button onClick={handleRedeem} className="primary-button w-full mt-4">
              Redeem Voucher
            </button>
            <div className="flex items-center gap-3 my-4">
              <div className="h-px bg-white/[.06] flex-1" />
              <span className="text-[10px] text-slate-600">OR</span>
              <div className="h-px bg-white/[.06] flex-1" />
            </div>
            <a
              href="https://wa.me/263719217133?text=Hello%20Omnixra%2C%20I%20want%20to%20buy%20a%20premium%20voucher"
              target="_blank"
              rel="noopener noreferrer"
              className="secondary-button w-full"
            >
              💬 Buy on WhatsApp
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export default PremiumModal;
