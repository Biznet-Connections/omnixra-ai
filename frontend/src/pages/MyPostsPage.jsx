import React, { useEffect, useState } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import PostCard from "../components/PostCard";
import api from "../api/axios";

function MyPostsPage({ setPage }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("=== FETCHING MY POSTS ===");
    api.get("/posts/my-posts")
      .then(res => {
        console.log("My posts:", res.data.length);
        setPosts(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Get my posts error:", err);
        setLoading(false);
      });
  }, []);

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
          <div className="space-y-3 mt-7">
            {posts.map(post => (
              <PostCard key={post._id} post={post} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyPostsPage;
