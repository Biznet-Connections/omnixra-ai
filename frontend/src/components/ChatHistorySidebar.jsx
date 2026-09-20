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
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.75)",
          zIndex: 9998,
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          top: 0, left: 0, bottom: 0,
          width: "320px",
          maxWidth: "85vw",
          backgroundColor: "#1a1a2e",
          borderRight: "2px solid rgba(255,255,255,0.15)",
          boxShadow: "10px 0 50px rgba(0,0,0,0.8)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          color: "white",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}
        >
          <h2 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "white" }}>Chat History</h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#a5b4fc",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* New Chat Button */}
        <div style={{ padding: "12px", flexShrink: 0 }}>
          <button
            onClick={() => { onNewChat(); onClose(); }}
            style={{
              width: "100%",
              height: "42px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              background: "linear-gradient(135deg, #6366f1, #7c3aed)",
              color: "white",
              border: "none",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={15} />
            New chat
          </button>
        </div>

        {/* Chat list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0 12px 16px",
          }}
        >
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
              <Loader2 className="animate-spin" style={{ color: "#818cf8" }} size={24} />
            </div>
          ) : chats.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <MessageSquare size={24} style={{ color: "#4b5563", margin: "0 auto 8px" }} />
              <p style={{ fontSize: "12px", color: "#6b7280" }}>No past chats yet</p>
            </div>
          ) : (
            Object.entries(groups).map(([label, items]) => items.length > 0 && (
              <div key={label} style={{ marginTop: "12px" }}>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    padding: "0 4px 6px",
                  }}
                >
                  {label}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
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
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        padding: "10px",
                        borderRadius: "10px",
                        cursor: "pointer",
                        backgroundColor: currentChatId === ch._id ? "rgba(255,255,255,0.08)" : "transparent",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = currentChatId === ch._id ? "rgba(255,255,255,0.08)" : "transparent"}
                    >
                      <MessageSquare size={14} style={{ color: "#9ca3af", flexShrink: 0, marginTop: "2px" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "white",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{ch.title}</span>
                          {loadingChatId === ch._id && <Loader2 size={10} className="animate-spin" style={{ color: "#818cf8" }} />}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#9ca3af",
                            marginTop: "2px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {ch.preview}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(ch._id, e)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#6b7280",
                          cursor: "pointer",
                          padding: "4px",
                          borderRadius: "6px",
                          opacity: 0.6,
                        }}
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
