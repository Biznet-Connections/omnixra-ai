import React, { useEffect, useState } from "react";
import JobCard from "../components/JobCard";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import LoadingDots from "../components/LoadingDots";

let cachedJobs = null;

function JobsPage({ focusJobSlug }) {
  const { user } = useAuth();
  const [allJobs, setAllJobs] = useState(cachedJobs || []);
  const [loading, setLoading] = useState(!cachedJobs);

  useEffect(() => {
    if (cachedJobs) return;
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

        let combined = [...aiJobs, ...formattedScraped].sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));

        cachedJobs = combined;
        setAllJobs(combined);
        setLoading(false);
      } catch (err) {
        console.error("Jobs error:", err);
        setLoading(false);
      }
    };
    fetchJobs();
  }, [user?.category]);

  return (
    <div className="page-scroll">
      <div className="page-container">
        <h1 className="page-title">Find your next opportunity</h1>
        <p className="page-subtitle">Jobs from Omnixra AI, our company network, and across Zimbabwe.</p>
        {loading ? (
          <div className="flex justify-center mt-10"><LoadingDots /></div>
        ) : allJobs.length === 0 ? (
          <div className="empty-state mt-7"><div className="empty-icon">💼</div><h2 className="text-sm font-semibold mt-4">No jobs available</h2></div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4 mt-7">
            {allJobs.map(job => (
              <div key={job._id} id={`job-${job.slug || job._id}`}>
                <JobCard job={job} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export default JobsPage;
