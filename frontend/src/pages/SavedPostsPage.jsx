import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import PostCard from "../components/PostCard";
import api from "../api/axios";
function SavedPostsPage({ setPage }) {
  const [posts, setPosts] = useState([]);
  useEffect(() => { api.get("/profile/saved-posts").then(res => setPosts(res.data)); }, []);
  return (
    <div className="page-scroll"><div className="page-container">
      <button onClick={() => setPage("home")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5"><ArrowLeft size={16} /> Back</button>
      <h1 className="page-title">Saved Posts</h1>
      {posts.length === 0 ? <div className="empty-state mt-7"><div className="empty-icon">🔖</div><h2 className="text-sm font-semibold mt-4">No saved posts</h2></div> :
        <div className="space-y-3 mt-7">{posts.map(p => <PostCard key={p._id} post={p} />)}</div>}
    </div></div>
  );
}
export default SavedPostsPage;
