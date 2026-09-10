import React, { createContext, useContext, useState, useCallback } from "react";
import api from "../api/axios";
import { useAuth } from "./AuthContext";

const PostsContext = createContext();

export const PostsProvider = ({ children }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
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

  const fetchPosts = useCallback(async (force = false) => {
    if (!force && posts.length > 0) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/posts?page=1&limit=7");
      const data = res.data;
      const shuffled = shuffleArray(data.posts || []);
      setPosts(shuffled);
      setHasMore(data.hasMore);
      setPage(2);
    } catch (err) {
      console.error("Fetch posts error:", err.message);
      setError("Failed to load posts. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [posts.length]);

  const loadMorePosts = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.get(`/posts?page=${page}&limit=7`);
      const data = res.data;
      setPosts(prev => {
        const existingIds = new Set(prev.map(p => p._id));
        const newPosts = (data.posts || []).filter(p => !existingIds.has(p._id));
        return [...prev, ...newPosts];
      });
      setHasMore(data.hasMore);
      setPage(prev => prev + 1);
    } catch (err) {
      console.error("Load more error:", err.message);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, page]);

  const addPost = (post) => setPosts(prev => [post, ...prev]);
  const updatePost = (updatedPost) => setPosts(prev => prev.map(p => p._id === updatedPost._id ? updatedPost : p));
  const removePost = (postId) => setPosts(prev => prev.filter(p => p._id !== postId));

  return (
    <PostsContext.Provider value={{ posts, loading, loadingMore, hasMore, error, fetchPosts, loadMorePosts, addPost, updatePost, removePost }}>
      {children}
    </PostsContext.Provider>
  );
};

export const usePosts = () => useContext(PostsContext);
