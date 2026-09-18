import React from "react";
import { Loader2 } from "lucide-react";

export default function ProgressModal({ title, steps = [] }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-box text-center">
        <Loader2 className="mx-auto text-indigo-400 animate-spin mb-4" size={48} />
        <h2 className="text-base font-bold mb-4">{title}</h2>
        <div className="space-y-2 text-left max-w-xs mx-auto">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {s.status === "done" && (
                <span className="text-emerald-400 w-3 text-center">&#10003;</span>
              )}
              {s.status === "active" && (
                <Loader2 size={12} className="animate-spin text-indigo-400 w-3" />
              )}
              {s.status === "pending" && (
                <span className="text-slate-600 w-3 text-center">&#9675;</span>
              )}
              <span className={s.status === "pending" ? "text-slate-600" : "text-slate-300"}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
