import React, { useState, useEffect } from "react";
import { ArrowRight, Search, FileText, BriefcaseBusiness, MessageCircle } from "lucide-react";
import api from "../api/axios";

function SavedChatsPage({ setPage }) {
  const [chats, setChats] = useState([]);

  useEffect(() => {
    api.get("/chats").then(res => setChats(res.data)).catch(() => {});
  }, []);

  const iconFor = (chat) => {
    const props = { size: 18 };
    if (chat.title.includes("CV")) return <FileText {...props} />;
    if (chat.title.includes("Remote")) return <BriefcaseBusiness {...props} />;
    if (chat.title.includes("Network")) return <Search {...props} />;
    return <MessageCircle {...props} />;
  };

  return (
    <div className="page-scroll">
      <div className="page-container">
        <h1 className="page-title">Saved Chats</h1>
        <p className="page-subtitle">Your previous AI conversations.</p>

        <div className="space-y-3 mt-7">
          {chats.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon"><MessageCircle size={24} /></div>
              <h2 className="text-sm font-semibold mt-4">No saved chats yet</h2>
              <p className="text-xs text-slate-700 mt-2">Chat with Omnixra AI and save important conversations.</p>
            </div>
          )}
          {chats.map(chat => (
            <button key={chat._id} onClick={() => setPage("chat")} className="saved-chat-card">
              <div className="saved-chat-icon bg-gradient-to-br from-indigo-500 to-purple-600">
                {iconFor(chat)}
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold">{chat.title}</div>
                <div className="text-[10px] text-slate-700 mt-1">
                  {chat.messages?.length || 0} messages · {new Date(chat.createdAt).toLocaleDateString()}
                </div>
              </div>
              <ArrowRight size={16} className="text-slate-600" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SavedChatsPage;
