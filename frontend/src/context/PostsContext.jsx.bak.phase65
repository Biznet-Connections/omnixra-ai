import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import api from "../api/axios";
import { useAuth } from "./AuthContext";

const PostsContext = createContext();

// ── localStorage cache key (per-user so switching accounts doesn't leak) ──
const CACHE_KEY_PREFIX = "omnixra_feed_cache_v1_";
const cacheKey = (userId) => CACHE_KEY_PREFIX + (userId || "anon");

// Read cache synchronously (fast)
function readCache(userId) {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.posts)) return null;
    // Ignore cache older than 24h
    if (parsed.t && Date.now() - parsed.t > 24 * 60 * 60 * 1000) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function writeCache(userId, posts, nextCursor, hasMore) {
  try {
    localStorage.setItem(
      cacheKey(userId),
      JSON.stringify({
        posts: posts.slice(0, 20), // cap at 20 to keep it small
        nextCursor: nextCursor || null,
        hasMore: !!hasMore,
        t: Date.now(),
      })
    );
  } catch (e) {
    // Quota exceeded — silently ignore
  }
}

export const PostsProvider = ({ children }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const cursorRef = useRef(null);
  const postsCountRef = useRef(0);
  const postsRef = useRef([]);
  const hydratedRef = useRef(false); // have we loaded cache yet?
  postsCountRef.current = posts.length;
  postsRef.current = posts;

  // ── 5B: Hydrate from cache SYNCHRONOUSLY on mount / user change ──
  useEffect(() => {
    if (hydratedRef.current) return;
    const cached = readCache(user?._id);
    if (cached && cached.posts.length > 0) {
      setPosts(cached.posts);
      cursorRef.current = cached.nextCursor;
      hasMoreRef.current = cached.hasMore;
      setHasMore(cached.hasMore);
      setLoading(false);
      console.log("📦 [CACHE] Hydrated", cached.posts.length, "posts instantly");
    }
    hydratedRef.current = true;
  }, [user?._id]);

  // ── 5C: Split fetch — 3 fast, then 10 in background ──
  const fetchPosts = useCallback(async (force = false) => {
    if (!force && postsCountRef.current > 0) return;
    try {
      setLoading(true);
      setError(null);

      // STEP 1: fetch just 3 for instant first paint
      const fast = await api.get("/posts?limit=3");
      const fastData = fast.data;
      const fastPosts = fastData.posts || [];

      if (fastPosts.length > 0) {
        setPosts(fastPosts);
        cursorRef.current = fastData.nextCursor || null;
        hasMoreRef.current = fastData.hasMore;
        setHasMore(fastData.hasMore);
        setLoading(false); // ← first 3 visible NOW
        writeCache(user?._id, fastPosts, fastData.nextCursor, fastData.hasMore);
        console.log("⚡ [FAST] First", fastPosts.length, "posts rendered");
      }

      // STEP 2: background fetch full 10 (fills the rest)
      const full = await api.get("/posts?limit=10");
      const fullData = full.data;
      const allPosts = fullData.posts || [];

      if (allPosts.length > 0) {
        setPosts(allPosts);
        cursorRef.current = fullData.nextCursor || null;
        hasMoreRef.current = fullData.hasMore;
        setHasMore(fullData.hasMore);
        writeCache(user?._id, allPosts, fullData.nextCursor, fullData.hasMore);
        console.log("📦 [FULL] Total", allPosts.length, "posts rendered");
      }
    } catch (err) {
      console.error("Fetch posts error:", err.message);
      setError("Failed to load posts. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  // ── Pull-to-refresh: shuffle in place, then fetch fresh ──
  const refreshPosts = useCallback(async () => {
    console.log("🔄 [REFRESH] START");
    setRefreshing(true);
    try {
      setError(null);

      const res = await api.get("/posts/random?limit=20");
      const data = res.data;
      const fresh = data.posts || [];
      if (fresh.length > 0) {
        setPosts(fresh);
        writeCache(user?._id, fresh, null, true);
      }

      const scroller = document.querySelector(".page-scroll");
      if (scroller) scroller.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("🔄 [REFRESH] ERROR:", err.message);
      setError("Failed to refresh. Please try again.");
    } finally {
      console.log("🔄 [REFRESH] END");
      setRefreshing(false);
    }
  }, [user?._id]);

  // ── Load more (infinite scroll) ──
  const loadMorePosts = useCallback(async () => {
    while (loadingRef.current) {
      await new Promise(r => setTimeout(r, 100));
    }
    loadingRef.current = true;

    if (!hasMoreRef.current) {
      if (postsCountRef.current === 0) {
        loadingRef.current = false;
        return;
      }
      try {
        const res = await api.get("/posts?limit=10");
        const data = res.data;
        const fresh = data.posts || [];
        const recycled = fresh.map(p => ({
          ...p,
          _id: p._id + "__recycle_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
          _originalId: p._id
        }));
        setPosts(prev => [...prev, ...recycled]);
        hasMoreRef.current = data.hasMore;
        setHasMore(data.hasMore);
        cursorRef.current = data.nextCursor || null;
      } catch (err) {
        console.error("Feed loop error:", err.message);
      } finally {
        loadingRef.current = false;
      }
      return;
    }

    setLoadingMore(true);
    try {
      const url = cursorRef.current
        ? "/posts?limit=10&cursor=" + encodeURIComponent(cursorRef.current)
        : "/posts?limit=10";
      const res = await api.get(url);
      const data = res.data;
      const newPosts = data.posts || [];

      setPosts(prev => [...prev, ...newPosts]);
      hasMoreRef.current = data.hasMore;
      setHasMore(data.hasMore);
      cursorRef.current = data.nextCursor || null;
      writeCache(user?._id, [...postsRef.current, ...newPosts], data.nextCursor, data.hasMore);
    } catch (err) {
      console.error("Load more error:", err.message);
    } finally {
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [user?._id]);

  // ── Optimistic helpers (unchanged API) ──
  const addPost = useCallback((post) => {
    setPosts(prev => [post, ...prev]);
  }, []);

  const removePost = useCallback((postId) => {
    setPosts(prev => prev.filter(p => p._id !== postId && p._originalId !== postId));
  }, []);

  const updatePost = useCallback((postId, updates) => {
    setPosts(prev =>
      prev.map(p =>
        (p._id === postId || p._originalId === postId)
          ? { ...p, ...updates }
          : p
      )
    );
  }, []);

  const value = {
    posts,
    loading,
    loadingMore,
    refreshing,
    hasMore,
    error,
    fetchPosts,
    refreshPosts,
    loadMorePosts,
    addPost,
    removePost,
    updatePost,
  };

  return <PostsContext.Provider value={value}>{children}</PostsContext.Provider>;
};

export const usePosts = () => {
  const ctx = useContext(PostsContext);
  if (!ctx) throw new Error("usePosts must be used inside PostsProvider");
  return ctx;
};
