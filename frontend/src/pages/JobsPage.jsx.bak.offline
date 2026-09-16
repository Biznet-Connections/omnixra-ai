import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Globe, Compass, Loader } from "lucide-react";
import JobCard from "../components/JobCard";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import LoadingDots from "../components/LoadingDots";

function JobsPage({ focusJobSlug }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("omnixra");
  const [omnixraJobs, setOmnixraJobs] = useState([]);
  const [scrapedJobs, setScrapedJobs] = useState([]);
  const [remoteJobs, setRemoteJobs] = useState([]);
  const [remoteComingSoon, setRemoteComingSoon] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState({});
  const [hasMore, setHasMore] = useState({ omnixra: true, scraped: true, remote: true });
  const [pages, setPages] = useState({ omnixra: 1, scraped: 1, remote: 1 });
  const [counts, setCounts] = useState({ omnixra: 0, scraped: 0, remote: 0 });
  const [seenTabs, setSeenTabs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("omnixra_seen_tabs") || "{}");
    } catch { return {}; }
  });

  const markTabSeen = (tabId) => {
    const updated = { ...seenTabs, [tabId]: Date.now() };
    setSeenTabs(updated);
    localStorage.setItem("omnixra_seen_tabs", JSON.stringify(updated));
  };

  // Count jobs newer than last-seen timestamp
  const getUnreadCount = (tabId, jobs) => {
    const lastSeen = seenTabs[tabId];
    if (!lastSeen) return jobs.length;
    return jobs.filter(j => j.createdAt && new Date(j.createdAt).getTime() > lastSeen).length;
  };
  const loadingRef = useRef(false);

  // Initial load: fetch tab 1 (Omnixra)
  useEffect(() => {
    fetchOmnixra(1);
  }, [user?.category]);

  const fetchOmnixra = async (page = 1) => {
    setTabLoading(prev => ({ ...prev, omnixra: true }));
    try {
      const res = await api.post(`/ai/jobs?page=1&limit=100`, { query: user?.category || "General" });
      const data = res.data;
      setOmnixraJobs(data.jobs || []);
      setCounts(prev => ({ ...prev, omnixra: data.total || data.jobs?.length || 0 }));
      setHasMore(prev => ({ ...prev, omnixra: false }));
      setLoading(false);
    } catch (err) {
      console.error("Omnixra fetch error:", err);
      setLoading(false);
    } finally {
      setTabLoading(prev => ({ ...prev, omnixra: false }));
    }
  };

  const fetchScraped = async (page = 1) => {
    if (tabLoading.scraped) return;
    setTabLoading(prev => ({ ...prev, scraped: true }));
    try {
      // Load ALL scraped jobs at once (no pagination)
      const res = await api.get(`/scraped-jobs?page=1&limit=500`);
      const data = res.data;
      setScrapedJobs(data.jobs || []);
      setCounts(prev => ({ ...prev, scraped: data.total || data.jobs?.length || 0 }));
      setHasMore(prev => ({ ...prev, scraped: false }));
    } catch (err) {
      console.error("Scraped fetch error:", err);
    } finally {
      setTabLoading(prev => ({ ...prev, scraped: false }));
    }
  };

  const fetchRemote = async (page = 1) => {
    if (tabLoading.remote) return;
    setTabLoading(prev => ({ ...prev, remote: true }));
    try {
      const res = await api.get(`/remote-jobs?page=${page}&q=${encodeURIComponent(user?.category || "remote")}`);
      const data = res.data;
      if (data.comingSoon) {
        setRemoteComingSoon(true);
        setRemoteJobs([]);
        setCounts(prev => ({ ...prev, remote: 0 }));
      } else {
        if (page === 1) {
          setRemoteJobs(data.jobs || []);
          setCounts(prev => ({ ...prev, remote: data.total || 0 }));
        } else {
          setRemoteJobs(prev => [...prev, ...(data.jobs || [])]);
        }
        setHasMore(prev => ({ ...prev, remote: data.hasMore || false }));
        setPages(prev => ({ ...prev, remote: page + 1 }));
      }
    } catch (err) {
      console.error("Remote fetch error:", err);
    } finally {
      setTabLoading(prev => ({ ...prev, remote: false }));
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    markTabSeen(tab);
    if (tab === "scraped" && scrapedJobs.length === 0) fetchScraped(1);
    if (tab === "remote" && remoteJobs.length === 0 && !remoteComingSoon) fetchRemote(1);
  };

  // Infinite scroll for the active tab
  useEffect(() => {
    const handleScroll = () => {
      if (loadingRef.current) return;
      const scrolled = window.innerHeight + window.scrollY;
      const nearBottom = scrolled >= document.body.offsetHeight - 500;

      if (!nearBottom || !hasMore[activeTab]) return;
      loadingRef.current = true;
      setTimeout(() => { loadingRef.current = false; }, 500);

      if (activeTab === "omnixra") fetchOmnixra(pages.omnixra);
      if (activeTab === "scraped") fetchScraped(pages.scraped);
      if (activeTab === "remote") fetchRemote(pages.remote);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeTab, pages, hasMore]);

  const tabs = [
    { id: "omnixra", icon: Sparkles, label: "Omnixra Jobs", count: getUnreadCount("omnixra", omnixraJobs), color: "#8b5cf6" },
    { id: "scraped", icon: Globe, label: "Other Sites", count: getUnreadCount("scraped", scrapedJobs), color: "#06b6d4" },
    { id: "remote", icon: Compass, label: "Remote", count: getUnreadCount("remote", remoteJobs), color: "#10b981" }
  ];

  const currentJobs = activeTab === "omnixra" ? omnixraJobs : activeTab === "scraped" ? scrapedJobs : remoteJobs;
  const isCurrentTabLoading = tabLoading[activeTab] || (activeTab === "omnixra" && loading);

  return (
    <div className="page-scroll">
      <div className="page-container">
        <h1 className="page-title">Find your next opportunity</h1>
        <p className="page-subtitle">Jobs from Omnixra AI, our network, and across Zimbabwe.</p>

        {/* Circular tabs */}
        <div className="jobs-tabs-row">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`jobs-tab-circle ${isActive ? "active" : ""}`}
                style={{ "--tab-color": tab.color }}
              >
                <div className="jobs-tab-ring">
                  <Icon size={22} />
                  {tab.count > 0 && (
                    <span className="jobs-tab-count">{tab.count > 99 ? "99+" : tab.count}</span>
                  )}
                </div>
                <span className="jobs-tab-label">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        {isCurrentTabLoading ? (
          <div className="flex flex-col items-center justify-center mt-20">
            <LoadingDots />
            <span className="text-xs text-slate-600 mt-4">
              {activeTab === "omnixra" ? "Loading jobs for you..." : activeTab === "scraped" ? "Loading jobs from other sites..." : "Loading remote jobs..."}
            </span>
          </div>
        ) : remoteComingSoon && activeTab === "remote" ? (
          <div className="empty-state mt-7">
            <div className="empty-icon">🌍</div>
            <h2 className="text-sm font-semibold mt-4">Remote jobs coming soon</h2>
            <p className="text-xs text-slate-700 mt-2">We're integrating global remote jobs from JSearch API. Check back soon!</p>
          </div>
        ) : currentJobs.length === 0 ? (
          <div className="empty-state mt-7">
            <div className="empty-icon">💼</div>
            <h2 className="text-sm font-semibold mt-4">No jobs available</h2>
            <p className="text-xs text-slate-700 mt-2">Check back soon.</p>
          </div>
        ) : (
          <>
            <div className="grid lg:grid-cols-2 gap-4 mt-7">
              {currentJobs.map((job, idx) => (
                <div key={`${activeTab}_${job._id || idx}_${idx}`} id={`job-${job.slug || job._id || idx}`}>
                  <JobCard job={job} tab={activeTab} />
                </div>
              ))}
            </div>
            {tabLoading[activeTab] && (
              <div className="flex justify-center py-6"><LoadingDots /></div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default JobsPage;
