import React, { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Clock3, User, Briefcase, FileText, MessageCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import LoadingDots from "../components/LoadingDots";

function ApplicationsPage({ setPage }) {
  const { user } = useAuth();
  const isCompany = user?.accountType === "company";

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const endpoint = isCompany ? "/jobs/applicants/me" : "/jobs/applications/me";
    api.get(endpoint)
      .then(res => { setApplications(res.data || []); setLoading(false); })
      .catch(err => {
        console.error(err);
        setError(err.response?.data?.message || "Failed to load");
        setLoading(false);
      });
  }, [isCompany]);

  if (loading) {
    return (
      <div className="page-scroll">
        <div className="page-container">
          <div className="flex justify-center mt-10"><LoadingDots /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button onClick={() => setPage("home")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
          <ArrowLeft size={16} /> Back
        </button>

        <h1 className="page-title">{isCompany ? "Applications Received" : "My Applications"}</h1>
        <p className="page-subtitle">
          {isCompany ? "Review candidates who applied to your jobs" : "Track your job applications"}
        </p>

        {error && <div className="text-xs text-red-400 mt-4">{error}</div>}

        {applications.length === 0 ? (
          <div className="empty-state mt-7">
            <div className="empty-icon"><FileText size={24} /></div>
            <h2 className="text-sm font-semibold mt-4">
              {isCompany ? "No applications yet" : "No applications yet"}
            </h2>
            <p className="text-xs text-slate-700 mt-2">
              {isCompany ? "Post a job to start receiving applications." : "Apply to jobs and track them here."}
            </p>
          </div>
        ) : (
          <div className="space-y-3 mt-7">
            {applications.map(app => (
              <div key={app._id} className="talent-card">
                {isCompany ? (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="avatar avatar-medium bg-gradient-to-br from-indigo-500 to-purple-600">
                        {app.userId?.profilePicture ? (
                          <img src={app.userId.profilePicture} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                        ) : (
                          app.userId?.name?.[0] || "U"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{app.userId?.name || "Applicant"}</div>
                        <div className="text-xs text-slate-600 mt-1">
                          <Briefcase size={11} className="inline mr-1" />
                          Applied to: {app.jobId?.title || "Job"}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-slate-600">
                          <span className="flex items-center gap-1"><MapPin size={11} />{app.userId?.location || "Location"}</span>
                          <span className="flex items-center gap-1"><Clock3 size={11} />{new Date(app.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {app.matchPercentage ? (
                        <div className="text-[10px] px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                          {app.matchPercentage}% match
                        </div>
                      ) : null}
                    </div>
                    {app.message && (
                      <p className="text-xs text-slate-400 mt-3 line-clamp-2 italic">
                        "{app.message.substring(0, 120)}..."
                      </p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setPage("user-profile")} className="outline-button flex-1">
                        <User size={13} />View Profile
                      </button>
                      <button onClick={() => setPage("inbox")} className="outline-button flex-1">
                        <MessageCircle size={13} />Message
                      </button>
                    </div>
                  </>
                ) : (
                  <>
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
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ApplicationsPage;
