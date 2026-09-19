import React, { useEffect, useState } from "react";
import { Briefcase, Users, MessageCircle, FileText, Plus, Search, TrendingUp, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

export default function CompanyHome({ setPage }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get("/company/dashboard")
      .then(res => { if (!cancelled) setStats(res.data); })
      .catch(e => console.warn("[CompanyHome] dashboard load failed:", e.message))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const data = stats || {
    activeJobs: 0,
    totalApplications: 0,
    unreadMessages: 0,
    totalJobs: 0,
    recentApplications: [],
  };

  return (
    <div className="company-home mb-4">
      {/* Welcome banner */}
      <div className="rounded-2xl border border-white/[.06] bg-gradient-to-br from-indigo-500/[.08] to-purple-500/[.04] p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 text-lg font-bold">
            {(user?.companyName || user?.name || "C").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-indigo-300 font-semibold uppercase tracking-wide">Company Dashboard</div>
            <div className="text-base font-bold truncate">{user?.companyName || user?.name || "Your Company"}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {data.activeJobs === 0 ? "Ready to hire? Post your first job." : `${data.activeJobs} active job${data.activeJobs === 1 ? "" : "s"}`}
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button onClick={() => setPage("my-posts")} className="rounded-xl border border-white/[.06] bg-white/[.02] p-3 text-left hover:border-white/[.15] transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
              <Briefcase size={14} className="text-indigo-400" />
            </div>
            <ArrowRight size={12} className="text-slate-600" />
          </div>
          <div className="text-2xl font-bold">{data.activeJobs}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Active Jobs</div>
        </button>

        <button onClick={() => setPage("applications")} className="rounded-xl border border-white/[.06] bg-white/[.02] p-3 text-left hover:border-white/[.15] transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Users size={14} className="text-emerald-400" />
            </div>
            <ArrowRight size={12} className="text-slate-600" />
          </div>
          <div className="text-2xl font-bold">{data.totalApplications}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Applicants</div>
        </button>

        <button onClick={() => setPage("inbox")} className="rounded-xl border border-white/[.06] bg-white/[.02] p-3 text-left hover:border-white/[.15] transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
              <MessageCircle size={14} className="text-purple-400" />
            </div>
            {data.unreadMessages > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold">
                {data.unreadMessages}
              </span>
            )}
          </div>
          <div className="text-2xl font-bold">{data.unreadMessages}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">New Messages</div>
        </button>

        <button onClick={() => setPage("professionals")} className="rounded-xl border border-white/[.06] bg-white/[.02] p-3 text-left hover:border-white/[.15] transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Search size={14} className="text-amber-400" />
            </div>
            <ArrowRight size={12} className="text-slate-600" />
          </div>
          <div className="text-2xl font-bold">Find</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Talent Search</div>
        </button>
      </div>

      {/* Big CTA — Post a Job */}
      <button
        onClick={() => setPage("post-job")}
        className="w-full p-4 rounded-xl border border-indigo-500/40 bg-indigo-500/[.06] text-left hover:border-indigo-500/60 transition-colors mb-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <Plus size={18} className="text-indigo-400" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm flex items-center gap-2">
              Post a Job
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">FREE</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Reach thousands of jobseekers in Zimbabwe
            </div>
          </div>
          <ArrowRight size={14} className="text-slate-600" />
        </div>
      </button>

      {/* Recent applicants */}
      {data.recentApplications && data.recentApplications.length > 0 && (
        <div className="rounded-2xl border border-white/[.06] bg-white/[.02] p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-emerald-400" />
              <span className="text-sm font-semibold">Recent applicants</span>
            </div>
            <button onClick={() => setPage("applications")} className="text-[10px] text-indigo-400 hover:text-indigo-300">
              View all
            </button>
          </div>
          <div className="space-y-2">
            {data.recentApplications.map((app, i) => (
              <button
                key={app._id || i}
                onClick={() => setPage("applications")}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/[.03] transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  {app.userId?.profilePicture ? (
                    <img src={app.userId.profilePicture} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    app.userId?.name?.[0] || "U"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{app.userId?.name || "Applicant"}</div>
                  <div className="text-[10px] text-slate-500 truncate">
                    Applied to {app.jobId?.title || "Job"}
                  </div>
                </div>
                <ArrowRight size={12} className="text-slate-600 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
