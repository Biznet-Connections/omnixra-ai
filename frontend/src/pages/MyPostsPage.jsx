import React, { useEffect, useState, useRef, useCallback } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import PostCard from "../components/PostCard";
import api from "../api/axios";

function MyPostsPage({ setPage }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef(null);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);

  // Initial load
  useEffect(() => {
    api.get("/posts/my-posts?limit=20")
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data.posts || []);
        const cursor = Array.isArray(res.data) ? null : (res.data.nextCursor || null);
        const more = Array.isArray(res.data) ? false : !!res.data.hasMore;
        setPosts(list);
        cursorRef.current = cursor;
        hasMoreRef.current = more;
        setHasMore(more);
      })
      .catch(err => {
        console.error("Get my posts error:", err?.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const url = cursorRef.current
        ? `/posts/my-posts?limit=20&cursor=${encodeURIComponent(cursorRef.current)}`
        : "/posts/my-posts?limit=20";
      const res = await api.get(url);
      const list = Array.isArray(res.data) ? res.data : (res.data.posts || []);
      setPosts(prev => {
        const existing = new Set(prev.map(p => p._id));
        return [...prev, ...list.filter(p => !existing.has(p._id))];
      });
      cursorRef.current = Array.isArray(res.data) ? null : (res.data.nextCursor || null);
      hasMoreRef.current = Array.isArray(res.data) ? false : !!res.data.hasMore;
      setHasMore(hasMoreRef.current);
    } catch (err) {
      console.error("Load more posts error:", err?.message);
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  // Scroll sentinel
  const sentinelRef = useRef(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const root = el.closest(".page-scroll");
    const onScroll = () => {
      if (loadingRef.current || !hasMoreRef.current) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (r.top < vh + 400) loadMore();
    };
    const target = root || window;
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, [loadMore]);

  const handleDelete = (postId) => {
    setPosts(prev => prev.filter(p => p._id !== postId));
  };

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button onClick={() => setPage("home")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
          <ArrowLeft size={16} />
          Back
        </button>

        <h1 className="page-title">My Posts</h1>
        <p className="page-subtitle">Manage your posts.</p>

        {loading ? (
          <div className="flex justify-center mt-10"><div className="loading-dot" /></div>
        ) : posts.length === 0 ? (
          <div className="empty-state mt-7">
            <div className="empty-icon"><FileText size={24} /></div>
            <h2 className="text-sm font-semibold mt-4">No posts yet</h2>
            <p className="text-xs text-slate-700 mt-2">Create your first post!</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 mt-7">
              {posts.map(post => (
                <PostCard key={post._id} post={post} onDelete={handleDelete} />
              ))}
            </div>
            {hasMore && <div ref={sentinelRef} className="py-6 text-center text-xs text-slate-600">{loadingMore ? "Loading..." : ""}</div>}
          </>
        )}
      </div>
    </div>
  );
}

export default MyPostsPage;
