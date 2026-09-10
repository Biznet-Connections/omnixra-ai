import React, { useState } from "react";
import { MapPin, DollarSign, Clock3, ExternalLink, Send, Bookmark, Share2, Sparkles, Check, Rocket } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import ApplyModal from "./ApplyModal";
import PremiumModal from "./PremiumModal";
import { shareJob } from "../utils/share";

function JobCard({ job, tab = "omnixra" }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const calculateMatch = () => {
    if (!user?.category || !job.category) return 30;
    const userCat = user.category.toLowerCase();
    const jobCat = job.category.toLowerCase();
    if (userCat === "general") return Math.floor(Math.random() * 20) + 30;
    if (userCat === jobCat) return 96;
    if (jobCat === "general") return Math.floor(Math.random() * 15) + 15;
    if (jobCat.includes(userCat) || userCat.includes(jobCat)) return 80;
    return Math.floor(Math.random() * 15) + 5;
  };

  const match = calculateMatch();
  const matchColor = match >= 80 ? "text-emerald-400" : match >= 50 ? "text-amber-400" : "text-red-400";

  const handleApplyForMe = async () => {
    if (!user?.isPremium) { setShowPremium(true); return; }
    try { await api.post(`/jobs/${job._id}/apply-for-me`); setApplied(true); }
    catch (err) { console.error(err); setShowPremium(true); }
  };

  const handleShare = async () => {
    try { await shareJob(job); } catch (err) { console.error(err); }
  };

  return (
    <>
      <div className="job-card compact-card">
        <div className="flex gap-3">
          <div className="job-logo bg-gradient-to-br from-indigo-500 to-blue-600">{job.company?.[0] || "C"}</div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between gap-3">
              <div>
                <div className="font-semibold text-sm truncate">{job.title}</div>
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
          <button
            onClick={() => {
              if (tab === "scraped" && job.applicationUrl) {
                window.open(job.applicationUrl, "_blank");
              } else {
                setShowApply(true);
              }
            }}
            className={`apply-button ${applied ? "applied" : ""}`}
          >
            {applied ? <Check size={13} /> : <Send size={13} />} {applied ? "Applied" : "Apply"}
          </button>
          <button onClick={() => setSaved(!saved)} className={`save-button ${saved ? "save-active" : ""}`}>
            <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
          </button>
          <button onClick={handleShare} className="outline-button"><Share2 size={13} />Share</button>
          <button onClick={handleApplyForMe} className="outline-button text-indigo-400"><Sparkles size={13} />Apply for me</button>
          {tab === "omnixra" && (
            <button onClick={() => setShowPremium(true)} className="outline-button text-amber-400"><Rocket size={13} />Push CV</button>
          )}
        </div>
      </div>

      {showApply && <ApplyModal job={job} onClose={() => setShowApply(false)} onApplied={() => setApplied(true)} />}
      {showPremium && <PremiumModal onClose={() => setShowPremium(false)} />}
      {showDetail && (
        <div className="modal-backdrop" onClick={() => setShowDetail(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{job.title}</h2>
              <button onClick={() => setShowDetail(false)} className="icon-button">✕</button>
            </div>
            <div className="text-sm text-slate-500 mb-3">{job.company} · {job.location}</div>
            <div className="flex flex-wrap gap-3 mb-4 text-xs text-slate-400">
              {job.salary && <span>💰 {job.salary}</span>}
              {job.type && <span>🕐 {job.type}</span>}
              {job.deadline && <span>📅 {new Date(job.deadline).toLocaleDateString()}</span>}
            </div>
            <p className="text-sm text-slate-300 leading-7">{job.description}</p>
            {job.source && job.source !== "omnixra" && <p className="text-xs text-slate-500 mt-3">Source: {job.source}</p>}
            <div className="flex gap-2 mt-5">
              <button onClick={() => { setShowDetail(false); setShowApply(true); }} className="apply-button flex-1">Apply Now</button>
              <button onClick={handleShare} className="outline-button">Share</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
export default JobCard;
