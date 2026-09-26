import React, { useState } from "react";
import { CheckCircle, ChevronRight, Briefcase, MapPin, Calendar, DollarSign, Users, Clock, TrendingUp } from "lucide-react";

function timeAgo(date) {
  if (!date) return null;
  const diff = Date.now() - new Date(date).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return `${Math.floor(d / 30)} month${Math.floor(d / 30) === 1 ? "" : "s"} ago`;
}

function daysUntil(date) {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  const d = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (d < 0) return "closed";
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  return `in ${d} days`;
}

export default function ApplicantPositionScreen({ rank, total, job, onBoost, onSimilar, onSkip }) {
  const [showDetails, setShowDetails] = useState(false);

  const postedAgo = timeAgo(job?.createdAt);
  const closing = daysUntil(job?.deadline || job?.closingDate);
  const salary = job?.salary;
  const location = job?.location;

  return (
    <div className="pos-screen">
      <div className="pos-scroll">
        {/* Success header */}
        <div className="pos-header">
          <div className="pos-check"><CheckCircle size={44} strokeWidth={1.8} /></div>
          <div className="pos-header-title">Application received</div>
          <div className="pos-header-job">{job?.title}</div>
          <div className="pos-header-company">{job?.company}</div>
        </div>

        {/* Position anchor */}
        <div className="pos-anchor">
          <div className="pos-anchor-label">You are</div>
          <div className="pos-anchor-number">{rank}<span className="pos-anchor-suffix">th</span></div>
          <div className="pos-anchor-sub">in this queue · {total} applicants</div>
        </div>

        {/* Job details grid */}
        <div className="pos-details">
          {postedAgo && (
            <div className="pos-detail-row">
              <Clock size={14} />
              <span className="pos-detail-label">Posted</span>
              <span className="pos-detail-value">{postedAgo}</span>
            </div>
          )}
          {closing && (
            <div className="pos-detail-row">
              <Calendar size={14} />
              <span className="pos-detail-label">Closes</span>
              <span className="pos-detail-value">{closing}</span>
            </div>
          )}
          {salary && (
            <div className="pos-detail-row">
              <DollarSign size={14} />
              <span className="pos-detail-label">Salary</span>
              <span className="pos-detail-value">{salary}</span>
            </div>
          )}
          {location && (
            <div className="pos-detail-row">
              <MapPin size={14} />
              <span className="pos-detail-label">Location</span>
              <span className="pos-detail-value">{location}</span>
            </div>
          )}
          <div className="pos-detail-row">
            <Users size={14} />
            <span className="pos-detail-label">Applicants</span>
            <span className="pos-detail-value">{total}</span>
          </div>
        </div>

        {/* Reality check */}
        <div className="pos-warning">
          <TrendingUp size={16} />
          <div>
            <div className="pos-warning-title">HR typically interviews 5–10 candidates</div>
            <div className="pos-warning-text">
              Applications after #10 rarely get a reply.
            </div>
          </div>
        </div>

        {/* Two CTAs */}
        <button className="pos-cta-primary" onClick={onBoost}>
          <div className="pos-cta-inner">
            <div className="pos-cta-title">Move me to the front</div>
            <div className="pos-cta-sub">Jump to position 1–10 in this queue</div>
          </div>
          <ChevronRight size={18} />
        </button>

        <button className="pos-cta-secondary" onClick={onSimilar}>
          <div className="pos-cta-inner">
            <div className="pos-cta-title">Apply to similar roles</div>
            <div className="pos-cta-sub">Other jobs matching your profile</div>
          </div>
          <ChevronRight size={18} />
        </button>

        <button className="pos-skip" onClick={onSkip}>
          Not now
        </button>
      </div>
    </div>
  );
}
