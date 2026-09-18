import React from "react";
import { CheckCircle } from "lucide-react";

export default function SuccessModal({
  title = "Success",
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onClose,
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box text-center" onClick={e => e.stopPropagation()}>
        <CheckCircle className="mx-auto text-emerald-400 mb-4" size={56} />
        <h2 className="text-lg font-bold mb-2">{title}</h2>
        {message && <p className="text-sm text-slate-400 mb-6 leading-relaxed">{message}</p>}
        {primaryLabel && (
          <button onClick={onPrimary} className="primary-button w-full mb-2">
            {primaryLabel}
          </button>
        )}
        {secondaryLabel && (
          <button
            onClick={onSecondary}
            className="secondary-button w-full justify-center"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
