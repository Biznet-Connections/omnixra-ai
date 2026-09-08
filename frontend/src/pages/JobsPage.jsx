import React, { useEffect, useState } from "react";
import JobCard from "../components/JobCard";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import LoadingDots from "../components/LoadingDots";

function JobsPage({ focusJobSlug }) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [scrapedJobs, setScrapedJobs] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const [aiRes, scrapedRes] = await Promise.all([
          api.post("/ai/jobs", { query: user?.category || "General" }),
          api.get("/scraped-jobs")
        ]);

        const aiJobs = aiRes.data.jobs || [];
        const scraped = scrapedRes.data || [];

        const formattedScraped = scraped.map(job => ({
          ...job,
          _id: job._id,
          source: "scraped",
          matchPercentage: job.matchPercentage || Math.floor(Math.random() * 30) + 20
        }));

        setJobs(aiJobs);
        setScrapedJobs(formattedScraped);
        
        // If focusJobSlug, fetch specific job and put it first
        let combined = [...aiJobs, ...formattedScraped].sort((a, b) => {
          const matchA = a.matchPercentage || 0;
          const matchB = b.matchPercentage || 0;
          return matchB - matchA;
        });

        if (focusJobSlug) {
          try {
            const { data } = await api.get(`/jobs/slug/${focusJobSlug}`);
            if (data && data._id) {
              const focusedJob = { ...data, matchPercentage: data.matchPercentage || 90 };
              combined = [focusedJob, ...combined.filter(j => j._id !== data._id)];
            }
          } catch (err) {
            console.log("Focused job fetch failed:", err.message);
          }
        }

        setAllJobs(combined);
        setLoading(false);
      } catch (err) {
        console.error("Jobs error:", err);
        setLoading(false);
      }
    };
    fetchJobs();
  }, [user?.category]);

  // Focus/scroll to shared job
  useEffect(() => {
    if (focusJobSlug && allJobs.length > 0) {
      const target = document.getElementById(`job-${focusJobSlug}`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [focusJobSlug, allJobs]);

  return (
    <div className="page-scroll">
      <div className="page-container">
        <h1 className="page-title">Find your next opportunity</h1>
        <p className="page-subtitle">Jobs from Omnixra AI, our company network, and across Zimbabwe.</p>

        {loading ? (
          <div className="flex justify-center mt-10"><LoadingDots /></div>
        ) : (
          <>
            {allJobs.length === 0 ? (
              <div className="empty-state mt-7">
                <div className="empty-icon">💼</div>
                <h2 className="text-sm font-semibold mt-4">No jobs available</h2>
                <p className="text-xs text-slate-700 mt-2">Check back soon or ask Omnixra AI.</p>
              </div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-4 mt-7">
                {allJobs.map(job => (
                  <div key={job._id} id={`job-${job.slug || job._id}`}>
                    <JobCard job={job} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
export default JobsPage;
