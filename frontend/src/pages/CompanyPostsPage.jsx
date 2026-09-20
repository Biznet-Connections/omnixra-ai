import React, { useEffect, useState } from "react";
import { ArrowLeft, Building2 } from "lucide-react";
import api from "../api/axios";
import PostCard from "../components/PostCard";
import LoadingDots from "../components/LoadingDots";

export default function CompanyPostsPage({ companyId, companyName, setPage }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!companyId) {
      setLoading(false);
      setError("No company selected");
      return;
    }
    api.get(`/companies/${companyId}/posts`)
      .then(res => { if (!cancelled) setPosts(res.data.posts || []); })
      .catch(e => { if (!cancelled) setError(e?.response?.data?.message || e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [companyId]);

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button onClick={() => setPage("companies")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-base font-bold">
            {companyName?.charAt(0)?.toUpperCase() || "C"}
          </div>
          <div>
            <h1 className="page-title">{companyName || "Company"}</h1>
            <p className="page-subtitle">Posts and announcements</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center mt-10"><LoadingDots /></div>
        ) : error ? (
          <div className="empty-state mt-7">
            <div className="empty-icon"><Building2 size={24} /></div>
            <h2 className="text-sm font-semibold mt-4">Could not load posts</h2>
            <p className="text-xs text-slate-700 mt-2">{error}</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state mt-7">
            <div className="empty-icon"><Building2 size={24} /></div>
            <h2 className="text-sm font-semibold mt-4">No posts yet</h2>
            <p className="text-xs text-slate-700 mt-2">This company hasn't posted anything.</p>
          </div>
        ) : (
          <div className="space-y-3 mt-7">
            {posts.map(p => (
              <PostCard key={p._id} post={p} onUpdate={() => {}} onDelete={() => {}} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
