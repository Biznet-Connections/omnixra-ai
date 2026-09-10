import React, { useEffect, useState } from "react";
import { ArrowLeft, MapPin, ShieldCheck, UserPlus, MessageCircle, Lock, X, Check, Sparkles, Clock, UserCheck } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import LoadingDots from "../components/LoadingDots";
import ModernVideoPlayer from "../components/ModernVideoPlayer";
import VerifiedBadge from "../components/VerifiedBadge";
import AIAvatar from "../components/AIAvatar";

function UserProfilePage({ userId, setPage }) {
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [following, setFollowing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false,
    requestSent: false,
    requestReceived: false,
    requestId: null
  });
  const [showConnections, setShowConnections] = useState(false);
  const [showFullPic, setShowFullPic] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (userId) {
      setLoading(true);
      api.get(`/profile/user/${userId}`)
        .then(res => {
          setProfile(res.data.user);
          setPosts(res.data.posts || []);
          setFollowing(res.data.isFollowing || false);
          setLoading(false);
        })
        .catch(err => {
          console.error("Profile fetch error:", err);
          setLoading(false);
        });

      // Fetch connection status
      api.get(`/connections/status/${userId}`)
        .then(res => {
          setConnectionStatus(res.data);
        })
        .catch(err => console.error("Connection status error:", err));
    }
  }, [userId, currentUser?._id]);

  // Listen for connection accepted event
  useEffect(() => {
    const handleConnectionAccepted = (event) => {
      if (event.detail?._id === userId) {
        setConnectionStatus(prev => ({ ...prev, isConnected: true, requestReceived: false, requestSent: false }));
      }
    };
    window.addEventListener("socket-connection-accepted", handleConnectionAccepted);
    return () => window.removeEventListener("socket-connection-accepted", handleConnectionAccepted);
  }, [userId]);

  const handleFollow = async () => {
    const newFollowing = !following;
    setFollowing(newFollowing);
    try {
      await api.put(`/posts/follow-user/${userId}`);
      // Update localStorage
      const list = JSON.parse(localStorage.getItem("omnixra_following") || "[]");
      if (newFollowing) {
        if (!list.includes(userId)) list.push(userId);
      } else {
        const idx = list.indexOf(userId);
        if (idx > -1) list.splice(idx, 1);
      }
      localStorage.setItem("omnixra_following", JSON.stringify(list));
    } catch (err) {
      console.error(err);
      setFollowing(!newFollowing);
    }
  };

  const handleConnect = async () => {
    if (connectionStatus.isConnected) return;

    if (connectionStatus.requestSent) {
      // Cancel request
      try {
        const sentRequests = await api.get("/connections/sent");
        const request = sentRequests.data.find(r => r.recipient?._id === userId);
        if (request) {
          await api.delete(`/connections/cancel/${request._id}`);
          setConnectionStatus(prev => ({ ...prev, requestSent: false }));
        }
      } catch (err) { console.error(err); }
      return;
    }

    if (connectionStatus.requestReceived && connectionStatus.requestId) {
      // Accept request
      try {
        await api.put(`/connections/accept/${connectionStatus.requestId}`);
        setConnectionStatus(prev => ({ ...prev, isConnected: true, requestReceived: false }));
      } catch (err) { console.error(err); }
      return;
    }

    // Send request
    try {
      await api.post(`/connections/request/${userId}`);
      setConnectionStatus(prev => ({ ...prev, requestSent: true }));
    } catch (err) { console.error(err); }
  };

  const handleMessage = async () => {
    try {
      // Find or create conversation WITHOUT pre-written message
      const res = await api.post("/messages", { otherUserId: userId });
      
      // Store the conversation ID and navigate to inbox with it selected
      localStorage.setItem("omnixra_open_conversation", res.data._id);
      setPage("inbox");
    } catch (err) { console.error(err); }
  };

  const handlePicTap = () => {
    if (profile?.profilePicLocked) return;
    if (profile?.profilePicture) setShowFullPic(true);
  };

  if (loading) {
    return (
      <div className="page-scroll">
        <div className="page-container flex justify-center mt-10">
          <LoadingDots />
        </div>
      </div>
    );
  }

  if (!profile) return <div className="page-scroll"><div className="page-container">User not found</div></div>;

  const isAI = profile.name === "Omnixra AI";

  const getConnectButtonText = () => {
    if (connectionStatus.isConnected) return "Connected";
    if (connectionStatus.requestSent) return "Request Sent";
    if (connectionStatus.requestReceived) return "Accept Request";
    return "Connect";
  };

  const getConnectIcon = () => {
    if (connectionStatus.isConnected) return <UserCheck size={14} />;
    if (connectionStatus.requestSent) return <Clock size={14} />;
    if (connectionStatus.requestReceived) return <Check size={14} />;
    return <UserPlus size={14} />;
  };

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button onClick={() => setPage("home")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="profile-cover"><div className="cover-glow" /></div>
        <div className="profile-main-card">
          <div className="profile-header">
            <button onClick={handlePicTap} className="profile-big-avatar">
              {isAI ? <AIAvatar size="large" /> : profile.profilePicLocked ? (
                <div className="flex flex-col items-center text-slate-500"><Lock size={20} /><span className="text-[9px] mt-1">Locked</span></div>
              ) : profile.profilePicture ? (
                <img src={profile.profilePicture} alt="" style={{ width: "100%", height: "100%", borderRadius: "22px", objectFit: "cover" }} />
              ) : (
                profile.name?.[0] || "U"
              )}
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold">{profile.name}</h1>
                {isAI && <VerifiedBadge size="md" label="Verified Omnixra AI" />}
                {isAI && <span className="ai-badge"><Sparkles size={10} /> AI</span>}
              </div>
              <p className="text-sm text-slate-500 mt-1">{profile.headline || "Professional"}</p>
              <div className="flex gap-3 mt-2 text-[10px] text-slate-700">
                <span><MapPin size={11} /> {profile.location || "Location"}</span>
              </div>
              <div className="flex gap-4 mt-3 text-[11px] text-slate-400">
                <button onClick={() => setShowConnections(true)} className="hover:text-indigo-300">{profile.connections?.length || 0} Connections</button>
                <span>{posts.length} Posts</span>
                <span>{posts.reduce((sum, p) => sum + (typeof p.likes === "number" ? p.likes : 0), 0)} Likes</span>
              </div>
            </div>
          </div>
          {!isAI && (
            <div className="flex gap-2 mt-4">
              <button onClick={handleConnect} className={`connect-button ${connectionStatus.isConnected ? "connected" : ""} ${connectionStatus.requestSent ? "request-sent" : ""}`}>
                {getConnectIcon()}
                {getConnectButtonText()}
              </button>
              <button onClick={handleFollow} className={`outline-button ${following ? "following" : ""}`}>
                {following ? <Check size={14} /> : <UserPlus size={14} />}
                {following ? "Following" : "Follow"}
              </button>
              <button onClick={handleMessage} className="outline-button">
                <MessageCircle size={14} /> Message
              </button>
            </div>
          )}
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-semibold mb-3">Posts</h2>
          {posts.length === 0 ? (
            <div className="empty-state">No public posts</div>
          ) : (
            <div className="space-y-4">
              {posts.map(p => (
                <div key={p._id} className="post-card">
                  <p className="text-sm text-slate-300">{p.text}</p>
                  {p.image && <img src={p.image} alt="" className="post-image mt-3" />}
                  {p.video && <ModernVideoPlayer src={p.video} text={p.text} authorName={profile.name} />}
                  {!p.image && !p.video && <div className="h-2" />}
                  <div className="flex gap-4 mt-2 text-[10px] text-slate-600">
                    <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                    <span>❤ {typeof p.likes === "number" ? p.likes : 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showConnections && (
        <div className="modal-backdrop" onClick={() => setShowConnections(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Connections</h2>
              <button onClick={() => setShowConnections(false)} className="icon-button"><X size={18} /></button>
            </div>
            {profile.connections?.length === 0 ? (
              <p className="text-xs text-slate-600">No connections yet</p>
            ) : (
              <div className="space-y-2">
                {profile.connections.map(conn => (
                  <div key={conn._id} className="flex items-center gap-3 p-2 hover:bg-white/[.03] rounded-lg">
                    <div className="avatar avatar-small bg-gradient-to-br from-indigo-500 to-purple-600">{conn.profilePicture ? <img src={conn.profilePicture} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : conn.name?.[0]}</div>
                    <div>
                      <div className="font-semibold text-sm">{conn.name}</div>
                      <div className="text-[10px] text-slate-600">{conn.headline}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showFullPic && profile.profilePicture && (
        <div className="modal-backdrop" onClick={() => setShowFullPic(false)}>
          <div className="full-picture-modal" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowFullPic(false)} className="absolute top-4 right-4 bg-black/60 rounded-full p-2"><X size={20} /></button>
            <img src={profile.profilePicture} alt="" style={{ maxWidth: "100%", maxHeight: "90vh", objectFit: "contain", borderRadius: "12px" }} />
          </div>
        </div>
      )}
    </div>
  );
}
export default UserProfilePage;
