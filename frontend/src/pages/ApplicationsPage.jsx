import React, { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Clock3 } from "lucide-react";
import api from "../api/axios";
import LoadingDots from "../components/LoadingDots";

function ApplicationsPage({ setPage }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/jobs/applications/me")
      .then(res => { setApplications(res.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button onClick={() => setPage("home")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="page-title">Applications</h1>
        <p className="page-subtitle">Track your job applications</p>

        {loading ? (
          <div className="flex justify-center mt-10"><LoadingDots /></div>
        ) : applications.length === 0 ? (
          <div className="empty-state mt-7">
            <div className="empty-icon">📩</div>
            <h2 className="text-sm font-semibold mt-4">No applications yet</h2>
            <p className="text-xs text-slate-700 mt-2">Apply to jobs and track them here.</p>
          </div>
        ) : (
          <div className="space-y-3 mt-7">
            {applications.map(app => (
              <div key={app._id} className="talent-card">
                <div className="font-semibold text-sm">{app.jobId?.title || "Job"}</div>
                <div className="text-xs text-slate-600 mt-1">{app.jobId?.company || "Company"}</div>
                <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-slate-600">
                  <span className="flex items-center gap-1"><MapPin size={11} />{app.jobId?.location}</span>
                  <span className="flex items-center gap-1"><Clock3 size={11} />{new Date(app.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className={`text-xs font-medium ${
                    app.status === "interview" ? "text-emerald-400" :
                    app.status === "viewed" ? "text-indigo-400" :
                    app.status === "rejected" ? "text-red-400" : "text-slate-400"
                  }`}>
                    {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                  </span>
                  <span className="text-[10px] text-slate-600">{app.matchPercentage}% match</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export default ApplicationsPage;
