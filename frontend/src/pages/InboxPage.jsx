import React, { useEffect, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

function InboxPage({ setPage }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    api.get("/messages")
      .then(res => setConversations(res.data))
      .catch(err => console.error(err));
  }, []);

  const openConversation = async (conversationId) => {
    try {
      const res = await api.get(`/messages/${conversationId}`);
      setSelectedConversation(res.data);
      setMessages(res.data.messages || []);
    } catch (err) { console.error(err); }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    try {
      const res = await api.post(`/messages/${selectedConversation._id}/message`, { text: newMessage });
      setMessages(res.data.messages || []);
      setNewMessage("");
    } catch (err) { console.error(err); }
  };

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button onClick={() => setPage("home")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="page-title">Inbox</h1>

        {!selectedConversation ? (
          <div className="space-y-3 mt-7">
            {conversations.length === 0 ? (
              <div className="empty-state">No conversations yet</div>
            ) : (
              conversations.map(conv => {
                const other = conv.participants?.find(p => p._id !== user?._id);
                return (
                  <button key={conv._id} onClick={() => openConversation(conv._id)} className="talent-card flex items-center gap-3 w-full text-left">
                    <div className="avatar avatar-small bg-gradient-to-br from-indigo-500 to-purple-600">
                      {other?.profilePicture ? <img src={other.profilePicture} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : other?.name?.[0]}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{other?.name || "User"}</div>
                      <div className="text-[10px] text-slate-600 truncate">{conv.lastMessage || "No messages"}</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        ) : (
          <div className="mt-7">
            <button onClick={() => setSelectedConversation(null)} className="text-slate-600 hover:text-white mb-4">← Back to inbox</button>
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender?._id === user?._id ? "justify-end" : "justify-start"}`}>
                  <div className={`${msg.sender?._id === user?._id ? "user-message" : "ai-message-text"} max-w-[80%] p-3 rounded-lg`}>
                    <span className="text-xs">{msg.text}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} className="form-input flex-1" placeholder="Type a message..." />
              <button onClick={sendMessage} className="send-button"><Send size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default InboxPage;
