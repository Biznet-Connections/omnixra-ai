import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import { useAuth } from "./AuthContext";

const PostsContext = createContext();

export const PostsProvider = ({ children }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Interleave so same author isn't adjacent
  const interleavePosts = (postList, currentUserId) => {
    if (!postList.length) return [];
    const ownPosts = postList.filter(p => p.author?._id === currentUserId || p.author === currentUserId);
    const otherPosts = postList.filter(p => p.author?._id !== currentUserId && p.author !== currentUserId);
    const all = shuffleArray([...ownPosts, ...otherPosts]);
    const result = [];
    let lastAuthor = null;
    while (all.length > 0) {
      let idx = all.findIndex(p => (p.author?._id || p.author) !== lastAuthor);
      if (idx === -1) idx = 0;
      const picked = all.splice(idx, 1)[0];
      result.push(picked);
      lastAuthor = picked.author?._id || picked.author;
    }
    return result;
  };

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/posts");
      const sorted = [...res.data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setPosts(interleavePosts(sorted, user?._id));
    } catch (err) {
      console.error("Fetch posts error:", err.message);
      setError("Failed to load posts. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchPosts();

    const handleNewPost = (event) => {
      const newPost = event.detail;
      setPosts(prev => {
        const exists = prev.some(p => p._id === newPost._id);
        if (exists) return prev;

        const isMyPost = newPost.author?._id === user?._id || newPost.author === user?._id;
        if (isMyPost) {
          const withoutTemp = prev.filter(p => !String(p._id).startsWith("temp_"));
          return [newPost, ...withoutTemp];
        }

        const position = Math.floor(Math.random() * (prev.length + 1));
        const newList = [...prev];
        newList.splice(position, 0, newPost);
        return newList;
      });
    };

    window.addEventListener("socket-new-post", handleNewPost);
    return () => window.removeEventListener("socket-new-post", handleNewPost);
  }, [fetchPosts, user?._id]);

  // When YOU post, add to TOP instantly (optimistic)
  const addPost = (post) => setPosts(prev => [post, ...prev]);

  const updatePost = (updatedPost) => setPosts(prev => prev.map(p => p._id === updatedPost._id ? updatedPost : p));
  const removePost = (postId) => setPosts(prev => prev.filter(p => p._id !== postId));

  return (
    <PostsContext.Provider value={{ posts, loading, error, addPost, updatePost, removePost, fetchPosts, interleavePosts }}>
      {children}
    </PostsContext.Provider>
  );
};

export const usePosts = () => useContext(PostsContext);
