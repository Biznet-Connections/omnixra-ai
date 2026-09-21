import React, { useState } from "react";
import { MapPin, DollarSign, Clock3, ExternalLink, Send, Bookmark, Share2, Check, Rocket } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import PremiumModal from "./PremiumModal";
import ApplyMethodModal from "./ApplyMethodModal";
import ApplyComposerPage from "../pages/ApplyComposerPage";
import PushCVModal from "./PushCVModal";
import LockedFeatureModal from "./LockedFeatureModal";
import PaymentModal from "./PaymentModal";
import { openGmailCompose, buildApplicationEmail } from "../utils/gmailCompose";
import { hasTier } from "../utils/tierHelpers";
import { shareJob } from "../utils/share";

function JobCard({ job, tab = "omnixra" }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [showApplyMethod, setShowApplyMethod] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [showPushCV, setShowPushCV] = useState(false);
  const [showLocked, setShowLocked] = useState(false);
  const [lockedFeature, setLockedFeature] = useState("This feature");
  const [activePlan, setActivePlan] = useState(null);
  const [applicantCount, setApplicantCount] = useState(0);
  const [showDetail, setShowDetail] = useState(false);

  const calculateMatch = () => {
    // If backend provided a real match score, use it
    if (typeof job?.matchScore === "number" && job.matchScore > 0) {
      return job.matchScore;
    }
    // Otherwise fallback (only for non-AI job feeds)
    if (!user?.category || !job.category) return 30;
    const userCat = user.category.toLowerCase();
    const jobCat = job.category.toLowerCase();
    if (userCat === "general") return Math.floor(Math.random() * 20) + 30;
    if (userCat === jobCat) return 90;
    if (jobCat === "general") return Math.floor(Math.random() * 15) + 15;
    if (jobCat.includes(userCat) || userCat.includes(jobCat)) return 75;
    return Math.floor(Math.random() * 15) + 20;
  };

  const match = calculateMatch();
  const matchColor = match >= 80 ? "text-emerald-400" : match >= 50 ? "text-amber-400" : "text-red-400";

  const handleShare = async () => {
    try { await shareJob(job); } catch (err) { console.error(err); }
  };

  const handleApplyClick = async () => {
    if (tab === "scraped" && job.applicationUrl) {
      window.open(job.applicationUrl, "_blank");
      return;
    }
    try {
      const res = await api.get(`/jobs/${job._id}/applicants`).catch(() => null);
      if (res?.data?.count) setApplicantCount(res.data.count);
    } catch {}
    setShowApplyMethod(true);
  };

  const handlePickGmail = () => {
    const { subject, body } = buildApplicationEmail({ user, job });
    openGmailCompose({
      to: job.companyEmail || "",
      subject,
      body,
    });
    api.post(`/jobs/${job._id}/apply-gmail-log`, { message: "Applied via Gmail" }).catch(() => {});
    setShowApplyMethod(false);
    setApplied(true);
  };

  const handlePickOmnixra = () => {
    setShowApplyMethod(false);
    setShowComposer(true);
  };

  const handlePickAuto = async () => {
    if (applying) return;
    setApplying(true);
    try {
      setShowApplyMethod(false);
      await api.post(`/jobs/${job._id}/apply-for-me`);
      setApplied(true);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 409) {
        setApplied(true);
      } else if (status === 403) {
        setLockedFeature("Auto Apply");
        setShowLocked(true);
      } else {
        console.error("auto apply failed:", e?.response?.data || e.message);
      }
    } finally {
      setApplying(false);
    }
  };

  const handleLocked = () => {
    setShowApplyMethod(false);
    setLockedFeature("Apply via Omnixra");
    setShowLocked(true);
  };

  const handlePushCV = () => {
    if (!hasTier(user, "starter")) {
      setLockedFeature("Push CV");
      setShowLocked(true);
      return;
    }
    setShowPushCV(true);
  };

  const handleRemotePushCV = async () => {
    if (!hasTier(user, "starter")) {
      setLockedFeature("Push CV");
      setShowLocked(true);
      return;
    }
    try {
      if (job.applicationUrl) {
        window.open(job.applicationUrl, "_blank");
      }
      setSaved(true);
    } catch (e) {
      console.error("Remote push CV failed:", e);
    }
  };

  return (
    <>
      <div className="job-card compact-card">
        <div className="flex gap-3">
          <div className="job-logo bg-gradient-to-br from-indigo-500 to-blue-600">{job.company?.[0] || "C"}</div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="font-semibold text-sm truncate">{job.title}</div>
                  {job.priorityUntil && new Date(job.priorityUntil) > new Date() && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold flex-shrink-0">
                      🔥 FEATURED
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-600 mt-1">{job.company}</div>
                {job.source === "scraped" && (
                  <div className="text-[9px] text-slate-500/70 mt-0.5 italic">
                    via {job.sourceUrl?.includes("iharare") ? "iharare" : job.sourceUrl?.includes("vacancymail") ? "vacancymail" : job.sourceUrl?.includes("zimbojobs") ? "zimbojobs" : "external"}
                  </div>
                )}
                {job.source === "ai-generated" && (
                  <div className="text-[9px] text-indigo-400/70 mt-0.5">Omnixra Job</div>
                )}
                {job.source === "jsearch" && (
                  <div className="text-[9px] text-slate-500/70 mt-0.5 italic">via JSearch</div>
                )}
                {["remoteok","jobicy","himalayas","remotive","arbeitnow"].includes(job.source) && (
                  <div className="text-[9px] text-emerald-400/80 mt-0.5 italic">
                    🌍 Remote · via {job.source.charAt(0).toUpperCase() + job.source.slice(1)}
                  </div>
                )}
              </div>
              <div className={`match-badge ${matchColor}`}>{match}% Match</div>
            </div>
            <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-slate-600">
              <span className="flex items-center gap-1"><MapPin size={11} />{job.location}</span>
              {job.salary && <span className="flex items-center gap-1"><DollarSign size={11} />{job.salary}</span>}
              {job.deadline && <span className="flex items-center gap-1"><Clock3 size={11} />{new Date(job.deadline).toLocaleDateString()}</span>}
            </div>
          </div>
        </div>
        <div className="card-actions">
          <button onClick={() => setShowDetail(true)} className="outline-button"><ExternalLink size={13} />View</button>
          <button onClick={handleApplyClick} className={`apply-button ${applied ? "applied" : ""}`}>
            {applied ? <Check size={13} /> : <Send size={13} />} {applied ? "Applied" : "Apply"}
          </button>
          <button onClick={() => setSaved(!saved)} className={`save-button ${saved ? "save-active" : ""}`}>
            <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
          </button>
          <button onClick={handleShare} className="outline-button"><Share2 size={13} />Share</button>
          {tab === "omnixra" && (
            <button onClick={handlePushCV} className="outline-button text-amber-400"><Rocket size={13} />Push CV</button>
          )}
          {tab === "remote" && (
            <button onClick={handleRemotePushCV} className="outline-button text-amber-400"><Rocket size={13} />Push CV</button>
          )}
        </div>
      </div>

      {showApplyMethod && (
        <ApplyMethodModal
          job={job}
          applicantCount={applicantCount}
          onClose={() => setShowApplyMethod(false)}
          onPickGmail={handlePickGmail}
          onPickOmnixra={handlePickOmnixra}
          onPickAuto={handlePickAuto}
          onLocked={handleLocked}
        />
      )}
      {showPushCV && (
        <PushCVModal
          job={job}
          onClose={() => setShowPushCV(false)}
          onPushAnother={() => { setShowPushCV(false); }}
        />
      )}
      {showComposer && (
        <ApplyComposerPage
          job={job}
          onClose={() => setShowComposer(false)}
          onSuccess={() => { setShowComposer(false); setApplied(true); }}
        />
      )}
      {showLocked && (
        <LockedFeatureModal
          featureName={lockedFeature}
          requiredTier="starter"
          description="Upgrade to unlock this premium feature and 5 more."
          onClose={() => setShowLocked(false)}
          onChoosePlan={(planKey) => { setShowLocked(false); setActivePlan(planKey); }}
          onSeePricing={() => { setShowLocked(false); setShowPremium(true); }}
        />
      )}
      {showPremium && (
        <PremiumModal onClose={() => setShowPremium(false)} />
      )}
      {activePlan && (
        <PaymentModal
          planKey={activePlan}
          onClose={() => setActivePlan(null)}
          onSuccess={() => setActivePlan(null)}
        />
      )}
      {showDetail && (
        <div className="modal-backdrop" onClick={() => setShowDetail(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{job.title}</h2>
              <button onClick={() => setShowDetail(false)} className="icon-button">&#10005;</button>
            </div>
            <div className="text-sm text-slate-500 mb-3">{job.company} &middot; {job.location}</div>
            <div className="flex flex-wrap gap-3 mb-4 text-xs text-slate-400">
              {job.salary && <span>&#128176; {job.salary}</span>}
              {job.type && <span>&#128336; {job.type}</span>}
              {job.deadline && <span>&#128197; {new Date(job.deadline).toLocaleDateString()}</span>}
            </div>
            <p className="text-sm text-slate-300 leading-7">{job.description}</p>
            {job.source && job.source !== "omnixra" && <p className="text-xs text-slate-500 mt-3">Source: {job.source}</p>}
            <div className="flex gap-2 mt-5">
              <button onClick={() => { setShowDetail(false); handleApplyClick(); }} className="apply-button flex-1">Apply Now</button>
              <button onClick={handleShare} className="outline-button">Share</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
export default JobCard;
