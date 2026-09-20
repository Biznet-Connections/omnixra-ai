import React, { useEffect, useState } from "react";
import { X, MessageSquare, Trash2, Plus, Loader2 } from "lucide-react";
import api from "../api/axios";

function groupByDate(chats) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const week = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups = { Today: [], Yesterday: [], "Last 7 days": [], Older: [] };
  chats.forEach(ch => {
    const d = new Date(ch.updatedAt);
    if (d >= today) groups.Today.push(ch);
    else if (d >= yesterday) groups.Yesterday.push(ch);
    else if (d >= week) groups["Last 7 days"].push(ch);
    else groups.Older.push(ch);
  });
  return groups;
}

export default function ChatHistorySidebar({ open, onClose, onLoad, onNewChat, currentChatId }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingChatId, setLoadingChatId] = useState(null);

  const load = () => {
    setLoading(true);
    api.get("/ai/chats")
      .then(res => setChats(res.data.chats || []))
      .catch(e => console.warn("[history] failed:", e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) load();
    if (typeof document !== "undefined") {
      if (open) document.body.classList.add("sidebar-open");
      else document.body.classList.remove("sidebar-open");
    }
    return () => {
      if (typeof document !== "undefined") document.body.classList.remove("sidebar-open");
    };
  }, [open]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Delete this chat?")) return;
    try {
      await api.delete(`/ai/chats/${id}`);
      setChats(prev => prev.filter(c => c._id !== id));
    } catch (err) { console.warn(err); }
  };

  if (!open) return null;

  const groups = groupByDate(chats);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70" onClick={onClose} />
      <div className="fixed top-0 left-0 bottom-0 z-50 w-80 max-w-xs bg-gray-900 border-r border-gray-700 flex flex-col text-white" style={{ boxShadow: "8px 0 40px rgba(0,0,0,0.7)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[.06]">
          <h2 className="text-sm font-bold">Chat History</h2>
          <button onClick={onClose} className="icon-button"><X size={18} /></button>
        </div>

        <button
          onClick={() => { onNewChat(); onClose(); }}
          className="mx-3 mt-3 primary-button w-full"
        >
          <Plus size={14} /> New chat
        </button>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-indigo-400" size={24} />
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare size={24} className="mx-auto text-slate-600 mb-2" />
              <p className="text-xs text-slate-500">No past chats yet</p>
            </div>
          ) : (
            Object.entries(groups).map(([label, items]) => items.length > 0 && (
              <div key={label}>
                <div className="text-[10px] text-slate-600 uppercase tracking-wide px-1 mb-1">{label}</div>
                <div className="space-y-1">
                  {items.map(ch => (
                    <div
                      key={ch._id}
                      onClick={async () => {
                        setLoadingChatId(ch._id);
                        try {
                          await onLoad(ch._id);
                          onClose();
                        } catch (e) {
                          alert(e?.response?.data?.message || "Could not load chat");
                        } finally {
                          setLoadingChatId(null);
                        }
                      }}
                      className={`group flex items-start gap-2 p-2 rounded-lg cursor-pointer hover:bg-white/[.04] ${currentChatId === ch._id ? "bg-white/[.06]" : ""}`}
                    >
                      <MessageSquare size={14} className="text-slate-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">
                          {ch.title}
                          {loadingChatId === ch._id && <Loader2 size={10} className="inline ml-2 animate-spin text-indigo-400" />}
                        </div>
                        <div className="text-[10px] text-slate-600 truncate mt-0.5">{ch.preview}</div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(ch._id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
