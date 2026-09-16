import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Search, X, Users, Briefcase, Building2, FileText, Sparkles } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import LoadingDots from "../components/LoadingDots";
import JobCard from "../components/JobCard";
import CompanyCard from "../components/CompanyCard";
import PostCard from "../components/PostCard";

const TABS = [
  { id: "all", label: "All" },
  { id: "people", label: "People" },
  { id: "jobs", label: "Jobs" },
  { id: "companies", label: "Companies" },
  { id: "posts", label: "Posts" },
];

function DiscoverPage({ setPage, setSelectedUserId }) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [results, setResults] = useState({ people: [], jobs: [], companies: [], posts: [] });
  const [suggested, setSuggested] = useState({ people: [], jobs: [] });
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef(null);

  // ── Load suggested content on mount ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [peopleRes, jobsRes] = await Promise.all([
          api.get("/profile/suggested-connections?limit=6").catch(() => ({ data: [] })),
          api.post("/ai/jobs?page=1&limit=6", { query: user?.category || "General" }).catch(() => ({ data: { jobs: [] } })),
        ]);
        if (cancelled) return;
        setSuggested({
          people: peopleRes.data || [],
          jobs: jobsRes.data?.jobs || [],
        });
      } catch (e) {
        console.warn("[DISCOVER] suggested load failed:", e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.category]);

  // ── Debounced search ──
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults({ people: [], jobs: [], companies: [], posts: [] });
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get("/search", { params: { q, type: activeTab } });
        setResults({
          people: res.data.people || [],
          jobs: res.data.jobs || [],
          companies: res.data.companies || [],
          posts: res.data.posts || [],
        });
        setError("");
      } catch (e) {
        console.error("[DISCOVER] search failed:", e.message);
        setError("Search failed. Try again.");
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, activeTab]);

  const clearQuery = () => setQuery("");

  const hasResults =
    results.people.length > 0 ||
    results.jobs.length > 0 ||
    results.companies.length > 0 ||
    results.posts.length > 0;

  const showSuggestions = !query.trim() && (suggested.people.length > 0 || suggested.jobs.length > 0);

  const renderPerson = (person) => (
    <div key={person._id} className="talent-card flex items-center gap-3">
      <button
        onClick={() => { setSelectedUserId(person._id); setPage("user-profile"); }}
        className="avatar avatar-small bg-gradient-to-br from-indigo-500 to-purple-600"
      >
        {person.profilePicture ? (
          <img src={person.profilePicture} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          person.name?.[0] || "U"
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{person.name}</div>
        <div className="text-[10px] text-slate-600 truncate">
          {person.headline || person.category || "Professional"}
          {person.location ? " · " + person.location : ""}
        </div>
      </div>
      <button
        onClick={() => { setSelectedUserId(person._id); setPage("user-profile"); }}
        className="outline-button text-xs"
      >
        View
      </button>
    </div>
  );

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button onClick={() => setPage("home")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
          <ArrowLeft size={16} /> Back
        </button>

        <h1 className="page-title">Discover</h1>
        <p className="page-subtitle">Find people, jobs, companies, and posts on Omnixra.</p>

        {/* ── Search bar ── */}
        <div className="discover-search-wrap mt-5">
          <Search size={16} className="discover-search-icon" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, jobs, companies..."
            className="discover-search-input"
            autoComplete="off"
            autoCapitalize="none"
          />
          {query && (
            <button onClick={clearQuery} className="discover-search-clear" aria-label="Clear">
              <X size={14} />
            </button>
          )}
        </div>

        {/* ── Filter tabs ── */}
        <div className="discover-tabs mt-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={"discover-tab " + (activeTab === tab.id ? "discover-tab-active" : "")}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {searching ? (
          <div className="flex justify-center mt-10">
            <LoadingDots />
          </div>
        ) : error ? (
          <div className="empty-state mt-7">
            <div className="empty-icon"><X size={24} /></div>
            <h2 className="text-sm font-semibold mt-4">Something went wrong</h2>
            <p className="text-xs text-slate-700 mt-2">{error}</p>
          </div>
        ) : query.trim() && !hasResults ? (
          <div className="empty-state mt-7">
            <div className="empty-icon"><Search size={24} /></div>
            <h2 className="text-sm font-semibold mt-4">No results</h2>
            <p className="text-xs text-slate-700 mt-2">
              Try different keywords or check your spelling.
            </p>
          </div>
        ) : query.trim() ? (
          <>
            {/* ALL tab — mixed preview */}
            {activeTab === "all" && (
              <>
                {results.people.length > 0 && (
                  <div className="mt-7">
                    <div className="discover-section-title">People</div>
                    <div className="space-y-3">
                      {results.people.slice(0, 3).map(renderPerson)}
                    </div>
                  </div>
                )}
                {results.companies.length > 0 && (
                  <div className="mt-7">
                    <div className="discover-section-title">Companies</div>
                    <div className="space-y-3">
                      {results.companies.slice(0, 3).map((c) => <CompanyCard key={c._id} company={c} />)}
                    </div>
                  </div>
                )}
                {results.jobs.length > 0 && (
                  <div className="mt-7">
                    <div className="discover-section-title">Jobs</div>
                    <div className="grid lg:grid-cols-2 gap-4">
                      {results.jobs.slice(0, 4).map((j) => <JobCard key={j._id} job={j} />)}
                    </div>
                  </div>
                )}
                {results.posts.length > 0 && (
                  <div className="mt-7">
                    <div className="discover-section-title">Posts</div>
                    <div className="space-y-3">
                      {results.posts.slice(0, 3).map((p) => (
                        <PostCard
                          key={p._id}
                          post={p}
                          onViewProfile={(author) => { if (author?._id) { setSelectedUserId(author._id); setPage("user-profile"); } }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* PEOPLE tab */}
            {activeTab === "people" && (
              <div className="space-y-3 mt-7">
                {results.people.map(renderPerson)}
              </div>
            )}

            {/* JOBS tab */}
            {activeTab === "jobs" && (
              <div className="grid lg:grid-cols-2 gap-4 mt-7">
                {results.jobs.map((j) => <JobCard key={j._id} job={j} />)}
              </div>
            )}

            {/* COMPANIES tab */}
            {activeTab === "companies" && (
              <div className="space-y-3 mt-7">
                {results.companies.map((c) => <CompanyCard key={c._id} company={c} />)}
              </div>
            )}

            {/* POSTS tab */}
            {activeTab === "posts" && (
              <div className="space-y-3 mt-7">
                {results.posts.map((p) => (
                  <PostCard
                    key={p._id}
                    post={p}
                    onViewProfile={(author) => { if (author?._id) { setSelectedUserId(author._id); setPage("user-profile"); } }}
                  />
                ))}
              </div>
            )}
          </>
        ) : showSuggestions ? (
          <>
            {/* Suggested content when no query */}
            {suggested.people.length > 0 && (
              <div className="mt-7">
                <div className="discover-section-title">People you may know</div>
                <div className="space-y-3">
                  {suggested.people.map(renderPerson)}
                </div>
              </div>
            )}
            {suggested.jobs.length > 0 && (
              <div className="mt-7">
                <div className="discover-section-title">Suggested jobs</div>
                <div className="grid lg:grid-cols-2 gap-4">
                  {suggested.jobs.map((j) => <JobCard key={j._id} job={j} />)}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state mt-7">
            <div className="empty-icon"><Sparkles size={24} /></div>
            <h2 className="text-sm font-semibold mt-4">Start typing to search</h2>
            <p className="text-xs text-slate-700 mt-2">
              Search for people, jobs, companies, or posts.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DiscoverPage;
