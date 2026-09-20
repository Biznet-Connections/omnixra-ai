import React, { useEffect, useState } from "react";
import { ArrowLeft, Briefcase, Users, Plus, MoreVertical, Sparkles, MapPin, Clock3 } from "lucide-react";
import api from "../api/axios";
import LoadingDots from "../components/LoadingDots";
import AIMatchingModal from "../components/AIMatchingModal";
import PaymentModal from "../components/PaymentModal";

export default function MyJobPostsPage({ setPage }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("active"); // active | expired | all
  const [menuOpen, setMenuOpen] = useState(null); // jobId
  const [aiMatchJob, setAiMatchJob] = useState(null);
  const [priorityJob, setPriorityJob] = useState(null);
  const [showPayment, setShowPayment] = useState(null);

  const loadJobs = () => {
    setLoading(true);
    api.get("/jobs/mine/list")
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data.jobs || []);
        setJobs(list);
      })
      .catch(e => setError(e?.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadJobs(); }, []);

  const filtered = jobs.filter(j => {
    if (tab === "active") return !j.isExpired && j.status !== "paused";
    if (tab === "expired") return j.isExpired || j.status === "paused";
    return true;
  });

  const counts = {
    active: jobs.filter(j => !j.isExpired && j.status !== "paused").length,
    expired: jobs.filter(j => j.isExpired || j.status === "paused").length,
    all: jobs.length,
  };

  const handlePriority = (job) => {
    setMenuOpen(null);
    setPriorityJob(job);
    setShowPayment("priority_listing");
  };

  const handleClose = async (job) => {
    if (!confirm(`Close "${job.title}"? It will be hidden from jobseekers but not deleted.`)) return;
    try {
      await api.put(`/jobs/${job._id}/close`);
      setMenuOpen(null);
      loadJobs();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to close job");
    }
  };

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button onClick={() => setPage("home")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
          <ArrowLeft size={16} /> Back
        </button>

        <h1 className="page-title">My Jobs</h1>
        <p className="page-subtitle">Manage your job posts</p>

        {/* Tabs */}
        <div className="flex gap-2 mt-5 mb-5">
          <button onClick={() => setTab("active")} className={"outline-button flex-1 " + (tab === "active" ? "category-active" : "")}>
            Active ({counts.active})
          </button>
          <button onClick={() => setTab("expired")} className={"outline-button flex-1 " + (tab === "expired" ? "category-active" : "")}>
            Closed ({counts.expired})
          </button>
          <button onClick={() => setTab("all")} className={"outline-button flex-1 " + (tab === "all" ? "category-active" : "")}>
            All ({counts.all})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center mt-10"><LoadingDots /></div>
        ) : error ? (
          <div className="empty-state mt-7">
            <h2 className="text-sm font-semibold mt-4">Could not load jobs</h2>
            <p className="text-xs text-slate-700 mt-2">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state mt-7">
            <div className="empty-icon"><Briefcase size={24} /></div>
            <h2 className="text-sm font-semibold mt-4">
              {tab === "active" ? "No active jobs" : tab === "expired" ? "No closed jobs" : "No jobs yet"}
            </h2>
            <p className="text-xs text-slate-700 mt-2">Post a job to start hiring.</p>
            <button onClick={() => setPage("post-job")} className="primary-button mt-4">
              <Plus size={14} /> Post a Job
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(job => (
              <div key={job._id} className="rounded-xl border border-white/[.06] bg-white/[.02] p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                    <div className="font-semibold text-sm truncate">{job.title}</div>
                    {job.priorityUntil && new Date(job.priorityUntil) > new Date() && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold flex-shrink-0">
                        🔥 FEATURED
                      </span>
                    )}
                  </div>
                    <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1"><MapPin size={10} />{job.location}</span>
                      <span>{job.category}</span>
                      {job.expiresAt && !job.isExpired && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Clock3 size={10} /> {job.daysLeft}d left
                        </span>
                      )}
                      {job.isExpired && <span className="text-red-400">Expired</span>}
                      {job.status === "paused" && <span className="text-slate-500">Closed</span>}
                    </div>
                  </div>
                  <button onClick={() => setMenuOpen(menuOpen === job._id ? null : job._id)} className="icon-button flex-shrink-0 relative">
                    <MoreVertical size={16} />
                    {menuOpen === job._id && (
                      <div className="absolute right-0 top-10 bg-[#1a1a2e] border border-white/[.08] rounded-lg py-1 z-10 min-w-[180px] text-left shadow-xl">
                        <button onClick={() => { setMenuOpen(null); setPage("post-job"); }} className="w-full text-left px-3 py-2 text-xs hover:bg-white/[.05]">✏️ Edit Job</button>
                        <button onClick={() => handlePriority(job)} className="w-full text-left px-3 py-2 text-xs hover:bg-white/[.05]">⚡ Boost Priority — $2</button>
                        <button onClick={() => handleClose(job)} className="w-full text-left px-3 py-2 text-xs hover:bg-white/[.05] text-red-400">🔴 Close Job</button>
                      </div>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-600">
                  <Users size={11} /> {job.applicantCount} applicant{job.applicantCount === 1 ? "" : "s"}
                </div>

                <div className="flex gap-2 mt-3">
                  <button onClick={() => setAiMatchJob(job)} className="outline-button flex-1 text-indigo-400">
                    <Sparkles size={13} /> Find Candidates
                  </button>
                  <button onClick={() => setPage("applications")} className="outline-button flex-1">
                    <Users size={13} /> Applicants
                  </button>
                </div>
              </div>
            ))}

            <button onClick={() => setPage("post-job")} className="primary-button w-full mt-4">
              <Plus size={14} /> Post a Job
            </button>
          </div>
        )}
      </div>

      {aiMatchJob && (
        <AIMatchingModal
          job={aiMatchJob}
          onClose={() => setAiMatchJob(null)}
          setPage={setPage}
          onPurchaseCredit={(type) => { setAiMatchJob(null); setShowPayment(type); }}
        />
      )}

      {priorityJob && showPayment === "priority_listing" && (
        <PaymentModal
          planKey="priority_listing"
          metadata={{ jobId: priorityJob._id }}
          onClose={() => { setShowPayment(null); setPriorityJob(null); }}
          onSuccess={() => { setShowPayment(null); setPriorityJob(null); loadJobs(); }}
        />
      )}
    </div>
  );
}
