import React, { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import api from "../api/axios";
import JobCard from "./JobCard";

export default function SimilarJobsSheet({ job, onClose }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!job) return;
    let cancelled = false;
    
    const fetchSimilar = async () => {
      setLoading(true);
      try {
        // We use the AI jobs endpoint because it already does keyword/category matching
        const query = job.category || job.title.split(" ")[0] || "General";
        const res = await api.get(`/scraped-jobs?search=${encodeURIComponent(query)}&limit=20`);
        
        // Filter out the job they just applied to
        const matches = (res.data.jobs || []).filter(j => j._id !== job._id);
        
        if (!cancelled) setJobs(matches);
      } catch (err) {
        console.error("Similar jobs fetch failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    
    fetchSimilar();
    return () => { cancelled = true; };
  }, [job]);

  return (
    <div className="similar-jobs-overlay">
      <div className="similar-jobs-header">
        <button className="icon-button" onClick={onClose}><ArrowLeft size={18} /></button>
        <div>
          <div className="similar-jobs-title">Similar to "{job?.title}"</div>
          <div className="similar-jobs-sub">More roles matching your profile</div>
        </div>
      </div>

      <div className="similar-jobs-body">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-400" /></div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-10 opacity-50">
            <Search size={32} className="mx-auto mb-2" />
            <p>No similar jobs found right now.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {jobs.map(j => (
              <JobCard 
                key={j._id} 
                job={j} 
                onApply={(selectedJob) => {
                  onClose();
                  window.dispatchEvent(new CustomEvent("push-navigate", { detail: { deepLink: `/job/${selectedJob.slug || selectedJob._id}` } }));
                }} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
