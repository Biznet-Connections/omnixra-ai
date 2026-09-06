import React, { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import api from "../api/axios";

function ProfileViewsPage({ setPage }) {
  const [views, setViews] = useState([]);
  useEffect(() => { api.get("/profile/views").then(res => setViews(res.data.profileViews || [])); }, []);
  return (
    <div className="page-scroll"><div className="page-container">
      <button onClick={() => setPage("home")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5"><ArrowLeft size={16} /> Back</button>
      <h1 className="page-title">Profile Views</h1><p className="page-subtitle">People who viewed your profile</p>
      {views.length === 0 ? <div className="empty-state mt-7"><div className="empty-icon">👁</div><h2 className="text-sm font-semibold mt-4">No views yet</h2></div> :
        <div className="space-y-3 mt-7">{views.map((v, i) => <div key={i} className="talent-card flex items-center gap-3"><div className="avatar avatar-small bg-gradient-to-br from-indigo-500 to-purple-600">{v.viewer?.name?.[0]}</div><div><div className="font-semibold text-sm">{v.viewer?.name}</div><div className="text-[10px] text-slate-600">{new Date(v.viewedAt).toLocaleString()}</div></div></div>)}</div>}
    </div></div>
  );
}
export default ProfileViewsPage;
