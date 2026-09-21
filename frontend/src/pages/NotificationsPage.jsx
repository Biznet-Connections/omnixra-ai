import React, { useEffect, useState, useCallback } from "react";
import { Bell, Heart, MessageCircle, UserPlus, AtSign } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const TYPE_ICON = {
  mention: AtSign,
  comment: MessageCircle,
  reply: MessageCircle,
  like: Heart,
  follow: UserPlus,
};

function timeAgoShort(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationsPage({ setPage, onOpenPost }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const [page, setPageNum] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchList = useCallback(async (p = 1) => {
    try {
      const res = await api.get(`/notifications?page=${p}&limit=20`);
      const data = res.data;
      setItems(prev => (p === 1 ? data.items : [...prev, ...data.items]));
      setUnread(data.unreadCount || 0);
      setHasMore(data.hasMore);
      setPageNum(p);
    } catch (e) {
      console.error("notif fetch:", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchList(1); }, [fetchList]);

  const handleTap = async (n) => {
    // Mark as read
    if (!n.read) {
      try {
        await api.patch(`/notifications/${n._id}/read`);
        setItems(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x));
        setUnread(u => Math.max(0, u - 1));
      } catch {}
    }
    // Navigate via deep link
    const dl = n.deepLink || "";
    if (dl.startsWith("/post/")) {
      const m = dl.match(/^\/post\/([^?]+)(?:\?comment=([^&]+))?/);
      if (m) {
        onOpenPost && onOpenPost(m[1], m[2] || null);
        return;
      }
    }
    if (dl.startsWith("/user/")) {
      const uid = dl.slice(6);
      setPage && setPage("profile", { userId: uid });
      return;
    }
    if (dl.startsWith("/inbox/")) {
      setPage && setPage("inbox");
      return;
    }
    // Fallback
    setPage && setPage("home");
  };

  const handleReadAll = async () => {
    try {
      await api.post("/notifications/read-all");
      setItems(prev => prev.map(x => ({ ...x, read: true })));
      setUnread(0);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="page-scroll">
      <div className="page-container">
        <div className="flex items-center justify-between mb-3">
          <h1 className="page-title">Notifications</h1>
          {unread > 0 && (
            <button onClick={handleReadAll} className="text-xs text-indigo-400 hover:text-indigo-300">
              Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-center text-xs text-slate-600 py-10">Loading…</p>
        ) : items.length === 0 ? (
          <div className="notif-empty">
            <Bell size={28} className="mx-auto mb-3 text-slate-700" />
            <p>No notifications yet</p>
            <p className="text-[11px] mt-1 text-slate-700">When someone mentions you, likes your post or follows you, it'll show up here.</p>
          </div>
        ) : (
          <div className="notif-list card">
            {items.map(n => {
              const Icon = TYPE_ICON[n.type] || Bell;
              return (
                <div
                  key={n._id}
                  className={`notif-item ${n.read ? "" : "unread"}`}
                  onClick={() => handleTap(n)}
                >
                  <div className={`notif-icon type-${n.type}`}>
                    {n.actorPicture ? (
                      <img src={n.actorPicture} alt="" />
                    ) : (
                      <Icon size={16} />
                    )}
                  </div>
                  <div className="notif-body">
                    <div className="notif-title">{n.title}</div>
                    {n.preview && <div className="notif-preview">{n.preview}</div>}
                    <div className="notif-time">{timeAgoShort(n.createdAt)} ago</div>
                  </div>
                  {!n.read && <div className="notif-dot" />}
                </div>
              );
            })}
            {hasMore && (
              <button
                onClick={() => fetchList(page + 1)}
                className="w-full py-3 text-xs text-indigo-400 hover:text-indigo-300"
              >
                Load more
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
