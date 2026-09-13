import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import api from "../api/axios";
import { useAuth } from "./AuthContext";

const PostsContext = createContext();

export const PostsProvider = ({ children }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const shuffleArray = (arr) => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const cursorRef = useRef(null);
  const postsCountRef = useRef(0);
  postsCountRef.current = posts.length;

  // ── Initial fetch (or forced reload) ──
  const fetchPosts = useCallback(async (force = false) => {
    if (!force && postsCountRef.current > 0) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/posts?limit=10");
      const data = res.data;
      const shuffled = shuffleArray(data.posts || []);
      setPosts(shuffled);
      setHasMore(data.hasMore);
      hasMoreRef.current = data.hasMore;
      cursorRef.current = data.nextCursor || null;
    } catch (err) {
      console.error("Fetch posts error:", err.message);
      setError("Failed to load posts. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Pull-to-refresh (Facebook-style): fetch bigger pool, shuffle, show fresh mix ──
  const refreshPosts = useCallback(async () => {
    setRefreshing(true);
    try {
      setError(null);

      // Facebook-style: fetch from a RANDOM position in the DB each time
      const res = await api.get("/posts/random?limit=30");
      const data = res.data;
      const allPosts = data.posts || [];

      // Shuffle the batch so even a similar set looks different
      const shuffled = shuffleArray(allPosts);

      // Show first 12
      const visible = shuffled.slice(0, 12);
      setPosts(visible);
      hasMoreRef.current = data.hasMore ?? true;
      setHasMore(true);
      cursorRef.current = null;

      // Scroll to top
      const scroller = document.querySelector(".page-scroll");
      if (scroller) scroller.scrollTo({ top: 0, behavior: "smooth" });

      console.log("🔄 [REFRESH] Fetched", allPosts.length, "random posts, showing", visible.length);
    } catch (err) {
      console.error("Refresh error:", err.message);
      setError("Failed to refresh. Please try again.");
    } finally {
      setRefreshing(false);
    }
  }, []);

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
        const shuffled = shuffleArray(data.posts || []);
        const recycled = shuffled.map(p => ({
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
      const res = await api.get(url);        // ← FIXED: was missing
      const data = res.data;
      setPosts(prev => {
        const existingIds = new Set(prev.map(p => p._id));
        const newPosts = (data.posts || []).filter(p => !existingIds.has(p._id));
        return [...prev, ...newPosts];
      });
      hasMoreRef.current = data.hasMore;
      setHasMore(data.hasMore);
      cursorRef.current = data.nextCursor || null;
    } catch (err) {
      console.error("Load more error:", err.message);
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  const addPost = (post) => setPosts(prev => [post, ...prev]);
  const updatePost = (updatedPost) => setPosts(prev => prev.map(p => p._id === updatedPost._id ? updatedPost : p));
  const removePost = (postId) => setPosts(prev => prev.filter(p => p._id !== postId));

  return (
    <PostsContext.Provider value={{ posts, loading, loadingMore, refreshing, hasMore, error, fetchPosts, refreshPosts, loadMorePosts, addPost, updatePost, removePost }}>
      {children}
    </PostsContext.Provider>
  );
};

export const usePosts = () => useContext(PostsContext);
