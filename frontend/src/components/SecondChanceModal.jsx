import React from "react";
import { AlertTriangle, Rocket } from "lucide-react";

export default function SecondChanceModal({ rank, total, onBoost, onSkip, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box second-chance-box" onClick={(e) => e.stopPropagation()}>
        <div className="second-chance-icon"><AlertTriangle size={28} /></div>
        <h3 className="second-chance-title">Are you sure?</h3>
        <p className="second-chance-text">
          You'll stay at <strong>#{rank}</strong>. {total - 10} candidates will be reviewed before you.
        </p>
        <button className="second-chance-boost" onClick={onBoost}>
          <Rocket size={15} /> Actually, boost me ($5/mo)
        </button>
        <button className="second-chance-skip" onClick={onSkip}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
