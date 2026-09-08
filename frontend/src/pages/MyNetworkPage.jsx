import React, { useEffect, useState } from "react";
import { ArrowLeft, UserPlus, Check, X, Users, UserCheck } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import LoadingDots from "../components/LoadingDots";

function MyNetworkPage({ setPage }) {
  const [connections, setConnections] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("connections");
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
    
    // Listen for new connection requests
    const handleConnectionRequest = () => {
      fetchData();
    };
    const handleConnectionAccepted = () => {
      fetchData();
    };
    
    window.addEventListener("socket-connection-request", handleConnectionRequest);
    window.addEventListener("socket-connection-accepted", handleConnectionAccepted);
    
    return () => {
      window.removeEventListener("socket-connection-request", handleConnectionRequest);
      window.removeEventListener("socket-connection-accepted", handleConnectionAccepted);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, pendingRes, sentRes] = await Promise.all([
        api.get("/profile/me"),
        api.get("/connections/pending"),
        api.get("/connections/sent")
      ]);
      setConnections(profileRes.data.connections || []);
      setPendingRequests(pendingRes.data || []);
      setSentRequests(sentRes.data || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleAccept = async (requestId) => {
    try {
      await api.put(`/connections/accept/${requestId}`);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDecline = async (requestId) => {
    try {
      await api.put(`/connections/decline/${requestId}`);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleCancel = async (requestId) => {
    try {
      await api.delete(`/connections/cancel/${requestId}`);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleRemove = async (userId) => {
    try {
      await api.delete(`/connections/remove/${userId}`);
      fetchData();
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="page-scroll"><div className="page-container flex justify-center mt-10"><LoadingDots /></div></div>;

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button onClick={() => setPage("home")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="page-title">My Network</h1>

        <div className="flex gap-2 mt-5">
          <button onClick={() => setActiveTab("connections")} className={`tab-button ${activeTab === "connections" ? "tab-active" : ""}`}>
            <Users size={14} /> Connections ({connections.length})
          </button>
          <button onClick={() => setActiveTab("pending")} className={`tab-button ${activeTab === "pending" ? "tab-active" : ""}`}>
            <UserPlus size={14} /> Requests ({pendingRequests.length})
          </button>
          <button onClick={() => setActiveTab("sent")} className={`tab-button ${activeTab === "sent" ? "tab-active" : ""}`}>
            <UserCheck size={14} /> Sent ({sentRequests.length})
          </button>
        </div>

        {activeTab === "connections" && (
          <div className="space-y-3 mt-5">
            {connections.length === 0 ? (
              <div className="empty-state">No connections yet</div>
            ) : (
              connections.map(person => (
                <div key={person._id} className="talent-card flex items-center gap-3">
                  <button onClick={() => { setPage("user-profile"); window.selectedUserId = person._id; }} className="avatar avatar-small bg-gradient-to-br from-indigo-500 to-purple-600">
                    {person.profilePicture ? <img src={person.profilePicture} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : person.name?.[0]}
                  </button>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{person.name}</div>
                    <div className="text-[10px] text-slate-600">{person.headline}</div>
                  </div>
                  <button onClick={() => handleRemove(person._id)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "pending" && (
          <div className="space-y-3 mt-5">
            {pendingRequests.length === 0 ? (
              <div className="empty-state">No pending requests</div>
            ) : (
              pendingRequests.map(request => (
                <div key={request._id} className="talent-card flex items-center gap-3">
                  <div className="avatar avatar-small bg-gradient-to-br from-indigo-500 to-purple-600">
                    {request.sender?.profilePicture ? <img src={request.sender.profilePicture} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : request.sender?.name?.[0]}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{request.sender?.name}</div>
                    <div className="text-[10px] text-slate-600">{request.sender?.headline}</div>
                  </div>
                  <button onClick={() => handleAccept(request._id)} className="connect-button connected"><Check size={14} /></button>
                  <button onClick={() => handleDecline(request._id)} className="icon-button text-red-400"><X size={14} /></button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "sent" && (
          <div className="space-y-3 mt-5">
            {sentRequests.length === 0 ? (
              <div className="empty-state">No sent requests</div>
            ) : (
              sentRequests.map(request => (
                <div key={request._id} className="talent-card flex items-center gap-3">
                  <div className="avatar avatar-small bg-gradient-to-br from-indigo-500 to-purple-600">
                    {request.recipient?.profilePicture ? <img src={request.recipient.profilePicture} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : request.recipient?.name?.[0]}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{request.recipient?.name}</div>
                    <div className="text-[10px] text-slate-600">{request.recipient?.headline}</div>
                  </div>
                  <button onClick={() => handleCancel(request._id)} className="text-xs text-slate-500 hover:text-slate-300">Cancel</button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
export default MyNetworkPage;
