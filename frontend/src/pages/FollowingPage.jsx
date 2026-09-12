import React, { useEffect, useState } from "react";
import { ArrowLeft, MessageCircle, UserPlus, Check } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import LoadingDots from "../components/LoadingDots";

function FollowingPage({ setPage, setSelectedUserId }) {
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchFollowing();
    
    // Listen for follow updates
    const handleFollowUpdate = (event) => {
      fetchFollowing();
    };
    window.addEventListener("socket-follow-update", handleFollowUpdate);
    return () => window.removeEventListener("socket-follow-update", handleFollowUpdate);
  }, [user]);

  const fetchFollowing = async () => {
    try {
      const res = await api.get("/profile/me");
      setFollowing(res.data.followingUsers || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleUnfollow = async (userId) => {
    try {
      await api.put(`/posts/follow-user/${userId}`);
      setFollowing(prev => prev.filter(u => u._id !== userId));
      // Update localStorage
      const list = JSON.parse(localStorage.getItem("omnixra_following") || "[]");
      const idx = list.indexOf(userId);
      if (idx > -1) list.splice(idx, 1);
      localStorage.setItem("omnixra_following", JSON.stringify(list));
    } catch (err) { console.error(err); }
  };

  const handleMessage = async (userId, name) => {
    try {
      const res = await api.post("/messages", { otherUserId: userId });
      localStorage.setItem("omnixra_open_conversation", res.data._id);
      setPage("inbox");
    } catch (err) { console.error(err); }
  };

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button onClick={() => setPage("home")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="page-title">Following</h1>
        {loading ? (
          <LoadingDots />
        ) : following.length === 0 ? (
          <div className="empty-state mt-7">Not following anyone yet</div>
        ) : (
          <div className="space-y-3 mt-7">
            {following.map(person => (
              <div key={person._id} className="talent-card flex items-center gap-3">
                <button
                  onClick={() => { setSelectedUserId?.(person._id); setPage("user-profile"); }}
                  className="avatar avatar-small bg-gradient-to-br from-indigo-500 to-purple-600"
                >
                  {person.profilePicture ? <img src={person.profilePicture} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : person.name?.[0]}
                </button>
                <button onClick={() => { setSelectedUserId?.(person._id); setPage("user-profile"); }} className="flex-1 text-left">
                  <div className="font-semibold text-sm">{person.name}</div>
                  <div className="text-[10px] text-slate-600">{person.headline}</div>
                </button>
                <button onClick={() => handleMessage(person._id, person.name)} className="outline-button"><MessageCircle size={14} /></button>
                <button onClick={() => handleUnfollow(person._id)} className="outline-button text-red-400"><UserPlus size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export default FollowingPage;
