import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MapPin, DollarSign, Clock3 } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

function JobSharePage() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    api.get(`/jobs/${id}`)
      .then(res => {
        setJob(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="flex justify-center mt-20"><div className="loading-dot" /></div>;
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold">Job not found</h1>
          <p className="text-sm text-slate-500 mt-2">This job may have been removed.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-bold">{job.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{job.company}</p>
          <p className="text-sm text-slate-500 mt-3">Sign in to view and apply for this job.</p>
          <a href="/" className="primary-button mt-4 inline-flex">Sign In / Create Account</a>
        </div>
      </div>
    );
  }

  return (
    <div className="page-scroll">
      <div className="page-container max-w-2xl">
        <div className="job-card">
          <div className="flex gap-4">
            <div className="job-logo-large bg-gradient-to-br from-indigo-500 to-blue-600">
              {job.company?.[0] || "C"}
            </div>
            <div>
              <h1 className="text-xl font-bold">{job.title}</h1>
              <div className="text-sm text-slate-600 mt-1">{job.company}</div>
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-600">
                <span className="flex items-center gap-1"><MapPin size={12} />{job.location}</span>
                {job.salary && <span className="flex items-center gap-1"><DollarSign size={12} />{job.salary}</span>}
                {job.deadline && <span className="flex items-center gap-1"><Clock3 size={12} />{new Date(job.deadline).toLocaleDateString()}</span>}
              </div>
            </div>
          </div>
          <p className="text-sm text-slate-400 leading-7 mt-5">{job.description}</p>
          <div className="flex gap-3 mt-6">
            <button className="apply-button">Apply</button>
            <button className="outline-button">Save</button>
            <button className="outline-button">Share</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default JobSharePage;
