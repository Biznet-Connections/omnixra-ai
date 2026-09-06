import React, { useEffect, useState } from "react";
import { ArrowLeft, MessageCircle } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import LoadingDots from "../components/LoadingDots";

function MyNetworkPage({ setPage, setSelectedUserId }) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    api.get("/profile/me")
      .then(res => {
        setConnections(res.data.connections || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [user]);

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button onClick={() => setPage("home")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="page-title">My Network</h1>
        {loading ? (
          <LoadingDots />
        ) : connections.length === 0 ? (
          <div className="empty-state mt-7">No connections yet</div>
        ) : (
          <div className="space-y-3 mt-7">
            {connections.map(person => (
              <div key={person._id} className="talent-card flex items-center gap-3">
                <button 
                  onClick={() => { setSelectedUserId?.(person._id); setPage("user-profile"); }}
                  className="avatar avatar-small bg-gradient-to-br from-indigo-500 to-purple-600"
                >
                  {person.profilePicture ? <img src={person.profilePicture} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : person.name?.[0]}
                </button>
                <button onClick={() => { setSelectedUserId?.(person._id); setPage("user-profile"); }} className="flex-1 text-left">
                  <div className="font-semibold text-sm">{person.name}</div>
                  <div className="text-[10px] text-slate-600">{person.headline}</div>
                </button>
                <button onClick={() => setPage("inbox")} className="outline-button"><MessageCircle size={14} /> Message</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export default MyNetworkPage;
