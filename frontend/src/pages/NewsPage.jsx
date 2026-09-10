import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import PostCard from "../components/PostCard";
import LoadingDots from "../components/LoadingDots";
import api from "../api/axios";

function NewsPage({ setPage }) {
  const [newsPosts, setNewsPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/posts/news")
      .then(res => { setNewsPosts(res.data); setLoading(false); })
      .catch(err => { console.error("News error:", err); setLoading(false); });
  }, []);

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button onClick={() => setPage("home")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="page-title">News</h1>
        <p className="page-subtitle">AI insights from Omnixra</p>
        {loading ? (
          <div className="flex justify-center mt-10"><LoadingDots /></div>
        ) : newsPosts.length === 0 ? (
          <div className="empty-state mt-7">
            <div className="empty-icon">📰</div>
            <h2 className="text-sm font-semibold mt-4">No news yet</h2>
            <p className="text-xs text-slate-700 mt-2">Check back soon for AI insights.</p>
          </div>
        ) : (
          <div className="space-y-3 mt-7">
            {newsPosts.map(post => <PostCard key={post._id} post={post} />)}
          </div>
        )}
      </div>
    </div>
  );
}
export default NewsPage;
