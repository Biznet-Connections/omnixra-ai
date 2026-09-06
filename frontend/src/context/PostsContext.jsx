import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../api/axios";

const PostsContext = createContext();

export const PostsProvider = ({ children }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/posts");
      const sorted = [...res.data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setPosts(sorted);
    } catch (err) {
      console.error("Fetch posts error:", err.message);
      setError("Failed to load posts. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    // NO setInterval, NO retries
  }, [fetchPosts]);

  const addPost = (post) => setPosts(prev => [post, ...prev]);
  const updatePost = (updatedPost) => setPosts(prev => prev.map(p => p._id === updatedPost._id ? updatedPost : p));
  const removePost = (postId) => setPosts(prev => prev.filter(p => p._id !== postId));

  return (
    <PostsContext.Provider value={{ posts, loading, error, addPost, updatePost, removePost, fetchPosts }}>
      {children}
    </PostsContext.Provider>
  );
};

export const usePosts = () => useContext(PostsContext);
