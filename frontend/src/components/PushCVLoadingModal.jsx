import React from "react";
import { Loader2 } from "lucide-react";

export default function PushCVLoadingModal({ title, subtitle }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-box text-center py-8">
        <Loader2 className="mx-auto text-indigo-400 animate-spin mb-4" size={48} />
        {title && <h2 className="text-base font-bold mb-2">{title}</h2>}
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}
