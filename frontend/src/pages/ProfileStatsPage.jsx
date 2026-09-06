import React, { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import api from "../api/axios";
function ProfileStatsPage({ setPage }) {
  const [stats, setStats] = useState({ profileViews: 0, companyViews: 0, posts: 0, saved: 0 });
  useEffect(() => {
    api.get("/profile/views").then(res => setStats({ profileViews: res.data.profileViews?.length || 0, companyViews: res.data.companyViews?.length || 0, posts: 0, saved: 0 }));
    api.get("/posts/my-posts").then(res => setStats(prev => ({ ...prev, posts: res.data.length })));
  }, []);
  return (
    <div className="page-scroll"><div className="page-container">
      <button onClick={() => setPage("home")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5"><ArrowLeft size={16} /> Back</button>
      <h1 className="page-title">Profile Stats</h1>
      <div className="grid grid-cols-2 gap-3 mt-7">
        <div className="stat-card"><div className="text-xs text-slate-600">Profile Views</div><div className="text-2xl font-bold mt-2">{stats.profileViews}</div></div>
        <div className="stat-card"><div className="text-xs text-slate-600">Company Views</div><div className="text-2xl font-bold mt-2">{stats.companyViews}</div></div>
        <div className="stat-card"><div className="text-xs text-slate-600">Posts</div><div className="text-2xl font-bold mt-2">{stats.posts}</div></div>
        <div className="stat-card"><div className="text-xs text-slate-600">Saved</div><div className="text-2xl font-bold mt-2">{stats.saved}</div></div>
      </div>
    </div></div>
  );
}
export default ProfileStatsPage;
