import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Globe, Compass, Loader } from "lucide-react";
import JobCard from "../components/JobCard";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import LoadingDots from "../components/LoadingDots";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import EmptyState from "../components/EmptyState";


// ── Jobs cache (offline-first) ──
const JOBS_CACHE_KEY = "omnixra_jobs_cache_v1";
const JOBS_CACHE_TTL = 24 * 60 * 60 * 1000;

function readJobsCache() {
  try {
    const raw = localStorage.getItem(JOBS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.t) return null;
    if (Date.now() - parsed.t > JOBS_CACHE_TTL) return null;
    return parsed;
  } catch (e) { return null; }
}

function writeJobsCache(payload) {
  try {
    localStorage.setItem(JOBS_CACHE_KEY, JSON.stringify({
      ...payload,
      t: Date.now(),
    }));
  } catch (e) {}
}

function JobsPage({ focusJobSlug }) {
  const { user } = useAuth();
  const { online } = useNetworkStatus();
  const [activeTab, setActiveTab] = useState(user ? "omnixra" : "scraped");
  const [resumeJob, setResumeJob] = useState(null);
  const [deeplinkLoading, setDeeplinkLoading] = useState(false);
  const [omnixraJobs, setOmnixraJobs] = useState([]);
  const [scrapedJobs, setScrapedJobs] = useState([]);
  const [remoteJobs, setRemoteJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState({});
  const [fetchedTabs, setFetchedTabs] = useState({ omnixra: false, scraped: false, remote: false });
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
  const sentinelRef = useRef(null);

  // Listen for the payment resume event
  useEffect(() => {
    const handleResume = (e) => {
      const detail = e.detail;
      if (detail.job) {
        setResumeJob(detail); // triggers the ApplyFlowPage rendering
      }
    };
    window.addEventListener("resume-cv-purchase", handleResume);
    return () => window.removeEventListener("resume-cv-purchase", handleResume);
  }, []);

  // Initial load: fetch tab 1 (Omnixra)
  useEffect(() => {
    if (user) {
      fetchOmnixra(1);
    } else {
      fetchScraped(1); // Fetch public jobs for guests immediately
      setLoading(false);
    }
  }, [user?.category]);


  // ── Deep-link: fetch job by slug, open the CORRECT tab, scroll + highlight ──
  useEffect(() => {
    if (!focusJobSlug) return;
    let cancelled = false;
    setDeeplinkLoading(true);

    const run = async () => {
      try {
        // Fetch the job from all three sources in parallel
        const [omniRes, scrRes, remRes] = await Promise.allSettled([
          api.get(`/jobs/slug/${focusJobSlug}`).catch(() => null),
          api.get(`/scraped-jobs/${focusJobSlug}`).catch(() => null),
          api.get(`/remote-jobs/slug/${focusJobSlug}`).catch(() => null),
        ]);

        if (cancelled) return;

        let found = null;
        let targetTab = "omnixra";

        // 1. Omnixra
        const omni = omniRes.status === "fulfilled" ? omniRes.value?.data : null;
        if (omni && (omni.slug === focusJobSlug || String(omni._id) === focusJobSlug)) {
          found = omni;
          targetTab = "omnixra";
        }

        // 2. Scraped (Local Jobs)
        if (!found) {
          const scr = scrRes.status === "fulfilled" ? scrRes.value?.data : null;
          const scrJob = scr?.job || scr;
          if (scrJob && (scrJob.slug === focusJobSlug || String(scrJob._id) === focusJobSlug)) {
            found = scrJob;
            targetTab = "scraped";
          }
        }

        // 3. Remote
        if (!found) {
          const rem = remRes.status === "fulfilled" ? remRes.value?.data : null;
          const remJob = rem?.job || rem;
          if (remJob && (remJob.slug === focusJobSlug || String(remJob._id) === focusJobSlug)) {
            found = remJob;
            targetTab = "remote";
          }
        }

        if (!found) {
          console.warn("[deeplink] job not found anywhere:", focusJobSlug);
          setDeeplinkLoading(false);
          return;
        }

        console.log("[deeplink] found in tab:", targetTab, "| title:", found.title);

        // Load that tab's jobs if not already loaded
        try {
          if (targetTab === "scraped" && scrapedJobs.length === 0) {
            await fetchScraped(1);
          } else if (targetTab === "remote" && remoteJobs.length === 0) {
            await fetchRemote(1);
          } else if (targetTab === "omnixra" && omnixraJobs.length === 0) {
            await fetchOmnixra(1);
          }
        } catch (e) {
          console.warn("[deeplink] tab fetch failed:", e.message);
        }

        if (cancelled) return;

        // Switch tab
        setActiveTab(targetTab);
        setDeeplinkLoading(false);
        if (typeof markTabSeen === "function") markTabSeen(targetTab);

        // Wait for render, then scroll + highlight
        let tries = 0;
        const MAX_TRIES = 30;
        const tryScroll = () => {
          if (cancelled) return;
          const el = document.querySelector(`[data-job-slug="${focusJobSlug}"]`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("job-highlight");
            setTimeout(() => el.classList.remove("job-highlight"), 4200);
            return;
          }
          tries++;
          if (tries < MAX_TRIES) setTimeout(tryScroll, 200);
          else console.warn("[deeplink] element not found after", MAX_TRIES, "tries");
        };
        setTimeout(tryScroll, 400);
      } catch (e) {
        console.warn("[deeplink] error:", e.message);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [focusJobSlug]);

  const fetchOmnixra = async (page = 1) => {
    setTabLoading(prev => ({ ...prev, omnixra: true }));
    try {
      // If no user, fetch public jobs instead of AI matches
      if (!user) {
        const res = await api.get('/jobs?page=1&limit=50');
        setOmnixraJobs(res.data.jobs || res.data || []);
        setCounts(prev => ({ ...prev, omnixra: res.data.total || 0 }));
        setHasMore(prev => ({ ...prev, omnixra: false }));
      } else {
        // Logged in: fetch AI matches
        const res = await api.post('/ai/jobs?page=1&limit=100', { query: user?.category || 'General' });
        const data = res.data;
        setOmnixraJobs(data.jobs || []);
        setCounts(prev => ({ ...prev, omnixra: data.total || data.jobs?.length || 0 }));
        setHasMore(prev => ({ ...prev, omnixra: false }));
      }
      setLoading(false);
    } catch (err) {
      console.error("Omnixra fetch error:", err);
      // Final fallback for guests if /jobs fails
      try {
        const fallbackRes = await api.get('/scraped-jobs?page=1&limit=50');
        setOmnixraJobs(fallbackRes.data.jobs || []);
      } catch (fallbackErr) {}
      setLoading(false);
    } finally {
      setTabLoading(prev => ({ ...prev, omnixra: false }));
      setFetchedTabs(prev => ({ ...prev, omnixra: true }));
    }
  };

  const fetchScraped = async (page = 1) => {
    if (tabLoading.scraped) return;
    setTabLoading(prev => ({ ...prev, scraped: true }));
    try {
      // Load 30 at a time, paginate
      const res = await api.get(`/scraped-jobs?page=${page}&limit=10`);
      const data = res.data;
      if (page === 1) {
        setScrapedJobs(data.jobs || []);
        setCounts(prev => ({ ...prev, scraped: data.total || data.jobs?.length || 0 }));
      } else {
        setScrapedJobs(prev => [...prev, ...(data.jobs || [])]);
      }
      setHasMore(prev => ({ ...prev, scraped: data.hasMore ?? ((data.jobs?.length || 0) === 10) }));
      setPages(prev => ({ ...prev, scraped: page + 1 }));
    } catch (err) {
      console.error("Scraped fetch error:", err);
    } finally {
      setTabLoading(prev => ({ ...prev, scraped: false }));
      setFetchedTabs(prev => ({ ...prev, scraped: true }));
      setLoading(false);
    }
  };

  const fetchRemote = async (page = 1) => {
    if (tabLoading.remote) return;
    setTabLoading(prev => ({ ...prev, remote: true }));
    try {
      const res = await api.get(`/remote-jobs?page=${page}`);
      const data = res.data;
      if (page === 1) {
        setRemoteJobs(data.jobs || []);
        setCounts(prev => ({ ...prev, remote: data.total || 0 }));
      } else {
        setRemoteJobs(prev => [...prev, ...(data.jobs || [])]);
      }
      setHasMore(prev => ({ ...prev, remote: data.hasMore || false }));
      setPages(prev => ({ ...prev, remote: page + 1 }));
    } catch (err) {
      console.error("Remote fetch error:", err);
    } finally {
      setTabLoading(prev => ({ ...prev, remote: false }));
          setFetchedTabs(prev => ({ ...prev, remote: true }));
}
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    markTabSeen(tab);
    if (tab === "scraped" && scrapedJobs.length === 0) fetchScraped(1);
    if (tab === "remote" && remoteJobs.length === 0) fetchRemote(1);
  };

  // Infinite scroll for the active tab
  

  // Infinite scroll via IntersectionObserver — works inside .page-scroll container
  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        if (loadingRef.current) return;
        if (!hasMore[activeTab]) return;

        loadingRef.current = true;
        setTimeout(() => { loadingRef.current = false; }, 500);

        if (activeTab === "omnixra") fetchOmnixra(pages.omnixra);
        if (activeTab === "scraped") fetchScraped(pages.scraped);
        if (activeTab === "remote") fetchRemote(pages.remote);
      },
      { root: null, rootMargin: "400px", threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeTab, pages, hasMore]);

  const tabs = [
    ...(user ? [{ id: "omnixra", icon: Sparkles, label: "My Matches", count: getUnreadCount("omnixra", omnixraJobs), color: "#8b5cf6" }] : []),
    { id: "scraped", icon: Globe, label: "Omnixra Jobs", count: getUnreadCount("scraped", scrapedJobs), color: "#06b6d4" },
    { id: "remote", icon: Compass, label: "Foreign", count: getUnreadCount("remote", remoteJobs), color: "#10b981" }
  ];

  const currentJobs = activeTab === "omnixra" ? omnixraJobs : activeTab === "scraped" ? scrapedJobs : remoteJobs;
  const isCurrentTabLoading = tabLoading[activeTab] || (activeTab === "omnixra" && loading);

  return (
    <>
      {resumeJob ? (
        <ApplyFlowPage
          job={resumeJob.job}
          initialDraft={resumeJob.draft}
          onClose={() => setResumeJob(null)}
          onSuccess={() => setResumeJob(null)}
        />
      ) : null}
      <div className="page-scroll">
      <div className="page-container">
        <h1 className="page-title">Find your next opportunity</h1>
        <p className="page-subtitle">Jobs from Omnixra AI, our network, and around the world.</p>

        {/* Circular tabs */}
        {deeplinkLoading ? (
          <div className="jobs-deeplink-loading">
            <LoadingDots />
            <p className="text-xs text-slate-500 mt-3">Opening job…</p>
          </div>
        ) : (
        <>
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
        ) : currentJobs.length === 0 && !tabLoading[activeTab] && !loading ? (
          <div className="empty-state mt-7">
            <div className="empty-icon">{navigator.onLine ? "💼" : "📡"}</div>
            <h2 className="text-sm font-semibold mt-4">{navigator.onLine ? "No jobs available" : "You are offline"}</h2>
            <p className="text-xs text-slate-700 mt-2">{navigator.onLine ? "Check back soon." : "Check your internet connection and try again."}</p>
          </div>
        ) : currentJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20">
            <LoadingDots />
            <span className="text-xs text-slate-600 mt-4">Still loading…</span>
          </div>
        ) : (
          <>
            <div className="grid lg:grid-cols-2 gap-4 mt-7">
              {currentJobs.map((job, idx) => (
                <div
                  key={`${activeTab}_${job._id || idx}_${idx}`}
                  id={`job-${job.slug || job._id || idx}`}
                  data-job-slug={job.slug || job._id || idx}
                  className="min-w-0 w-full"
                >
                  <JobCard job={job} tab={activeTab} />
                </div>
              ))}
            </div>
            {/* Infinite scroll sentinel — when this scrolls into view, load more */}
            <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />
            {tabLoading[activeTab] && (
              <div className="flex justify-center py-6"><LoadingDots /></div>
            )}
            {!hasMore[activeTab] && currentJobs.length > 0 && (
              <p className="text-center text-xs opacity-50 py-6">You've reached the end</p>
            )}
          </>
        )}
        </>
        )}
      </div>
    </div>
    </>
  );
}
export default JobsPage;
