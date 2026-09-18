import React, { useState } from "react";
import { X, Rocket, Check } from "lucide-react";
import api from "../api/axios";

function BoostModal({ post, onClose }) {
  const [selected, setSelected] = useState(null);
  const [voucherCode, setVoucherCode] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const options = [
    { reach: 20000, price: 2, label: "20,000 people" },
    { reach: 80000, price: 5, label: "80,000 people" }
  ];

  const handleBoost = async () => {
    if (!selected) { setError("Select a boost option"); return; }
    try {
      await api.post("/boosts", {
        type: "post",
        postId: post?._id,
        reach: selected.reach,
        price: selected.price,
        voucherCode
      });
      setSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to boost");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">🚀 Boost Post</h2>
          <button onClick={onClose} className="icon-button"><X size={18} /></button>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="text-lg font-bold">Boost Activated!</h3>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-400 mb-4">Choose your reach:</p>
            <div className="space-y-3">
              {options.map(opt => (
                <button
                  key={opt.reach}
                  onClick={() => setSelected(opt)}
                  className={`w-full p-4 rounded-xl border transition-all ${
                    selected?.reach === opt.reach
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-white/[.06] bg-white/[.02] hover:border-white/[.15]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm">🔥 {opt.label}</div>
                      <div className="text-xs text-slate-500 mt-1">Reach {opt.label}</div>
                    </div>
                    <div className="text-lg font-bold text-indigo-400">${opt.price}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4">
              <label className="form-label">Voucher code (from WhatsApp)</label>
              <input value={voucherCode} onChange={e => setVoucherCode(e.target.value)} className="form-input" placeholder="ABC123" />
            </div>

            {error && <div className="mt-2 text-xs text-red-400">{error}</div>}

            <button onClick={handleBoost} className="primary-button w-full mt-4">
              <Rocket size={16} /> Activate Boost
            </button>

            <a
              href="https://wa.me/263719217133?text=Hello%20Omnixra%2C%20I%20want%20to%20boost%20my%20post"
              target="_blank"
              rel="noopener noreferrer"
              className="secondary-button w-full mt-3"
            >
              💬 Buy Voucher on WhatsApp
            </a>
          </>
        )}
      </div>
    </div>
  );
}
export default BoostModal;
