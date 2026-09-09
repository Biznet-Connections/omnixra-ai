import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import { useAuth } from "./AuthContext";

const PostsContext = createContext();

export const PostsProvider = ({ children }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // Fisher-Yates shuffle
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Interleave posts so same author doesn't appear consecutively
  const interleavePosts = (postList, currentUserId) => {
    if (!postList.length) return [];

    // Separate own posts and others (for priority)
    const ownPosts = postList.filter(p => p.author?._id === currentUserId || p.author === currentUserId);
    const otherPosts = postList.filter(p => p.author?._id !== currentUserId && p.author !== currentUserId);

    // Shuffle others and own to start random
    const shuffledOwn = shuffleArray(ownPosts);
    const shuffledOthers = shuffleArray(otherPosts);

    const all = shuffleArray([...shuffledOwn, ...shuffledOthers]);

    // Build result, avoiding consecutive same author
    const result = [];
    let lastAuthor = null;
    while (all.length > 0) {
      let idx = all.findIndex(p => {
        const author = p.author?._id || p.author;
        return author !== lastAuthor;
      });
      if (idx === -1) idx = 0; // If impossible, just take first
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
      const finalPosts = interleavePosts(sorted, user?._id);
      setPosts(finalPosts);
    } catch (err) {
      console.error("Fetch posts error:", err.message);
      setError("Failed to load posts. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchPosts();

    // Socket new post -> random position for others
    const handleNewPost = (event) => {
      const newPost = event.detail;
      setPosts(prev => {
        const exists = prev.some(p => p._id === newPost._id);
        if (exists) return prev;
        // Insert at random position (not always top)
        const position = Math.floor(Math.random() * (prev.length + 1));
        const newList = [...prev];
        newList.splice(position, 0, newPost);
        return newList;
      });
    };

    window.addEventListener("socket-new-post", handleNewPost);
    return () => window.removeEventListener("socket-new-post", handleNewPost);
  }, [fetchPosts]);

  // When YOU post, add to TOP instantly (optimistic)
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
