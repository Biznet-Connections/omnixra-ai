import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../api/axios";

const PostsContext = createContext();

export const PostsProvider = ({ children }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fisher-Yates shuffle with random seed
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Random position insertion for socket posts
  const insertRandomPosition = (postList, newPost) => {
    const position = Math.floor(Math.random() * (postList.length + 1));
    const newList = [...postList];
    newList.splice(position, 0, newPost);
    return newList;
  };

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/posts");
      const sorted = [...res.data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      // Shuffle posts Facebook-style
      const shuffled = shuffleArray(sorted);
      setPosts(shuffled);
    } catch (err) {
      console.error("Fetch posts error:", err.message);
      setError("Failed to load posts. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();

    // Socket new post → insert at RANDOM position
    const handleNewPost = (event) => {
      const newPost = event.detail;
      setPosts(prev => {
        const exists = prev.some(p => p._id === newPost._id);
        if (exists) return prev;
        return insertRandomPosition(prev, newPost);
      });
    };

    // Socket post deleted
    const handlePostDeleted = (event) => {
      const postId = event.detail;
      setPosts(prev => prev.filter(p => p._id !== postId));
    };

    // Socket post liked
    const handlePostLiked = (event) => {
      const { postId, likes } = event.detail;
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, likes } : p));
    };

    // Socket post commented
    const handlePostCommented = (event) => {
      const { postId, comments } = event.detail;
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, comments } : p));
    };

    // Socket post edited
    const handlePostEdited = (event) => {
      const updatedPost = event.detail;
      setPosts(prev => prev.map(p => p._id === updatedPost._id ? { ...p, text: updatedPost.text, edited: true } : p));
    };

    window.addEventListener("socket-new-post", handleNewPost);
    window.addEventListener("socket-post-deleted", handlePostDeleted);
    window.addEventListener("socket-post-liked", handlePostLiked);
    window.addEventListener("socket-post-commented", handlePostCommented);
    window.addEventListener("socket-post-edited", handlePostEdited);

    return () => {
      window.removeEventListener("socket-new-post", handleNewPost);
      window.removeEventListener("socket-post-deleted", handlePostDeleted);
      window.removeEventListener("socket-post-liked", handlePostLiked);
      window.removeEventListener("socket-post-commented", handlePostCommented);
      window.removeEventListener("socket-post-edited", handlePostEdited);
    };
  }, [fetchPosts]);

  // Your OWN post → goes to TOP instantly (optimistic)
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
