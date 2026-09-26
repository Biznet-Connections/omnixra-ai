import React from "react";
import { CheckCircle } from "lucide-react";

export default function BoostSuccessScreen({ oldRank, newRank, jobTitle, company, planName, planDuration, onDone }) {
  return (
    <div className="boost-success-screen">
      <div className="boost-success-content">
        <div className="boost-success-check"><CheckCircle size={56} strokeWidth={1.6} /></div>

        <div className="boost-success-title">
          You're now {newRank}th in line
        </div>

        <div className="boost-success-job">{jobTitle}</div>
        <div className="boost-success-company">{company}</div>

        <div className="boost-success-divider" />

        <div className="boost-success-shift">
          <div className="boost-success-shift-label">Position moved</div>
          <div className="boost-success-shift-numbers">
            <span className="boost-success-old">#{oldRank}</span>
            <span className="boost-success-arrow">→</span>
            <span className="boost-success-new">#{newRank}</span>
          </div>
        </div>

        <div className="boost-success-divider" />

        <div className="boost-success-promise">
          HR will see you in the first 10 applications.
        </div>

        {planName && (
          <div className="boost-success-receipt">
            {planName} · valid {planDuration}
          </div>
        )}

        <button className="boost-success-done" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
