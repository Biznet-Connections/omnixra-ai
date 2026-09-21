import React, { useEffect, useState, useRef } from "react";
import api from "../api/axios";

// Usage:
// const [mentionState, setMentionState] = useState({ open: false, query: "", anchorIndex: -1 });
// <MentionAutocomplete
//   open={mentionState.open}
//   query={mentionState.query}
//   onSelect={(user) => { /* insert @Name + track user */ }}
//   onClose={() => setMentionState(s => ({ ...s, open: false }))}
// />

export default function MentionAutocomplete({ open, query, onSelect, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!open) { setUsers([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!query || query.length < 1) { setUsers([]); return; }
      setLoading(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(query)}&type=people&limit=8`);
        const list = res.data?.people || [];
        setUsers(list);
        setActiveIndex(0);
      } catch (e) {
        console.error("[mention] search error:", e.message);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [open, query]);

  if (!open) return null;

  return (
    <div className="mention-autocomplete" role="listbox">
      {loading ? (
        <div className="mention-item mention-loading">Searching…</div>
      ) : users.length === 0 ? (
        <div className="mention-item mention-empty">No users found</div>
      ) : (
        users.map((u, i) => (
          <button
            key={u._id}
            type="button"
            className={`mention-item ${i === activeIndex ? "active" : ""}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onSelect(u); onClose && onClose(); }}
          >
            <div className="mention-avatar">
              {u.profilePicture ? (
                <img src={u.profilePicture} alt="" />
              ) : (
                <span>{(u.name || "U")[0].toUpperCase()}</span>
              )}
            </div>
            <div className="mention-info">
              <span className="mention-name">{u.name}</span>
              {u.headline && <span className="mention-headline">{u.headline}</span>}
            </div>
          </button>
        ))
      )}
    </div>
  );
}
