import React, { useEffect, useMemo, useState } from "react";
import {
  Clock3, MapPin, CheckCircle2, Eye, MessageCircle, XCircle, Briefcase,
  Star, Archive, Trash2, Inbox as InboxIcon, RotateCcw, MoreVertical, MessageSquare,
} from "lucide-react";
import api from "../api/axios";
import LoadingDots from "../components/LoadingDots";

const FOLDERS = [
  { id: "all",       label: "All" },
  { id: "replied",   label: "Replied" },
  { id: "starred",   label: "Starred" },
  { id: "archived",  label: "Archived" },
  { id: "trash",     label: "Trash" },
];

// Deterministic color from company name
const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f59e0b",
  "#10b981", "#06b6d4", "#3b82f6", "#a855f7", "#f43f5e",
  "#14b8a6", "#eab308",
];
function colorFor(name) {
  if (!name) return "#6366f1";
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function timeAgo(date) {
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

function statusStyle(status) {
  switch (status) {
    case "shortlisted": return { color: "#10b981", label: "Shortlisted", icon: CheckCircle2 };
    case "interview":   return { color: "#a855f7", label: "Interview",   icon: MessageCircle };
    case "viewed":      return { color: "#6366f1", label: "Under review", icon: Eye };
    case "rejected":    return { color: "#ef4444", label: "Not selected", icon: XCircle };
    default:            return { color: "#94a3b8", label: "Applied",      icon: Briefcase };
  }
}

function ApplicationsTab({ setPage }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState("all");
  const [menuFor, setMenuFor] = useState(null);

  const load = async () => {
    try {
      const r = await api.get("/jobs/applications/me");
      setApps(r.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const hasReply = (a) => Array.isArray(a.replies) && a.replies.length > 0;

  const filtered = useMemo(() => {
    let list = apps;
    if (folder === "replied")       list = list.filter(a => hasReply(a) && !a.deleted);
    else if (folder === "starred")  list = list.filter(a => a.starred && !a.deleted);
    else if (folder === "archived") list = list.filter(a => a.archived && !a.deleted);
    else if (folder === "trash")    list = list.filter(a => a.deleted);
    else                            list = list.filter(a => !a.deleted && !a.archived);
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [apps, folder]);

  const counts = useMemo(() => ({
    all: apps.filter(a => !a.deleted && !a.archived).length,
    replied: apps.filter(a => hasReply(a) && !a.deleted).length,
    starred: apps.filter(a => a.starred && !a.deleted).length,
    archived: apps.filter(a => a.archived && !a.deleted).length,
    trash: apps.filter(a => a.deleted).length,
  }), [apps]);

  const isUnread = (a) => {
    if (!hasReply(a)) return false;
    const lastReply = a.replies[a.replies.length - 1];
    if (!lastReply) return false;
    if (lastReply.from === "user") return false; // my own reply — not unread
    if (!a.lastSeenAt) return true;
    return new Date(lastReply.createdAt) > new Date(a.lastSeenAt);
  };

  const doAction = async (appId, action) => {
    try {
      if (action === "delete") {
        await api.delete(`/jobs/applications/${appId}`);
        setApps(prev => prev.filter(a => a._id !== appId));
        setMenuFor(null);
        return;
      }
      const map = {
        star: `/jobs/applications/${appId}/star`,
        archive: `/jobs/applications/${appId}/archive`,
        trash: `/jobs/applications/${appId}/trash`,
        restore: `/jobs/applications/${appId}/restore`,
      };
      const r = await api.put(map[action]);
      setApps(prev => prev.map(a => {
        if (a._id !== appId) return a;
        if (action === "star") return { ...a, starred: r.data.starred };
        if (action === "archive") return { ...a, archived: r.data.archived };
        if (action === "trash") return { ...a, deleted: true };
        if (action === "restore") return { ...a, deleted: false };
        return a;
      }));
      setMenuFor(null);
    } catch (e) {
      alert(e.response?.data?.message || "Action failed");
    }
  };

  const openDetail = (appId) => {
    sessionStorage.setItem("open_application_id", appId);
    api.put(`/jobs/applications/${appId}/thread-seen`).catch(() => {});
    setPage("application-detail");
  };

  if (loading) {
    return <div className="flex justify-center mt-10"><LoadingDots /></div>;
  }

  return (
    <div className="apps-inbox">
      <aside className="apps-folders">
        {FOLDERS.map(f => {
          const active = folder === f.id;
          return (
            <button
              key={f.id}
              className={`apps-folder ${active ? "active" : ""}`}
              onClick={() => setFolder(f.id)}
            >
              <span className="flex-1 text-left">{f.label}</span>
              {counts[f.id] > 0 && <span className="apps-folder-count">{counts[f.id]}</span>}
            </button>
          );
        })}
      </aside>

      <div className="apps-list-wrap">
        {filtered.length === 0 ? (
          <div className="empty-state mt-7">
            <div className="empty-icon"><Briefcase size={24} /></div>
            <h2 className="text-sm font-semibold mt-4">
              {folder === "trash" ? "Trash is empty" :
               folder === "starred" ? "No starred applications" :
               folder === "archived" ? "No archived applications" :
               folder === "replied" ? "No replies yet" :
               "No applications yet"}
            </h2>
            {folder === "all" && (
              <button className="primary-button mt-4" onClick={() => setPage("jobs")}>
                Browse Jobs
              </button>
            )}
          </div>
        ) : (
          <div className="apps-list">
            {filtered.map(app => {
              const s = statusStyle(app.status);
              const StatusIcon = s.icon;
              const job = app.jobId || {};
              const company = job.company || app.companyName || "Company";
              const initial = (company[0] || "?").toUpperCase();
              const bg = colorFor(company);
              const unread = isUnread(app);
              const replyCount = Array.isArray(app.replies) ? app.replies.length : 0;
              return (
                <div key={app._id} className={`app-row ${unread ? "unread" : ""}`}>
                  <button className="app-row-main" onClick={() => openDetail(app._id)}>
                    <div className="app-row-avatar" style={{ background: bg }}>
                      {initial}
                    </div>
                    <div className="app-row-body">
                      <div className="app-row-title">
                        {unread ? <span className="unread-dot" /> : null}
                        {company}
                      </div>
                      <div className="app-row-company">{job.title || "Job"}</div>
                      <div className="app-row-meta">
                        {replyCount > 0 ? (
                          <span className="app-row-reply-badge">
                            <MessageSquare size={11} /> {replyCount}
                          </span>
                        ) : null}
                        <span className="flex items-center gap-1"><Clock3 size={11} />{timeAgo(app.createdAt)}</span>
                        {job.location ? (
                          <span className="flex items-center gap-1"><MapPin size={11} />{job.location}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="app-row-status" style={{ color: s.color }}>
                      <StatusIcon size={12} />
                      <span>{s.label}</span>
                    </div>
                  </button>

                  <button
                    className="app-row-menu-btn"
                    onClick={() => setMenuFor(menuFor === app._id ? null : app._id)}
                    title="More"
                  >
                    <MoreVertical size={15} />
                  </button>

                  {menuFor === app._id ? (
                    <div className="app-row-menu" onClick={e => e.stopPropagation()}>
                      {!app.deleted && (
                        <button onClick={() => doAction(app._id, "star")}>
                          <Star size={13} /> {app.starred ? "Unstar" : "Star"}
                        </button>
                      )}
                      {!app.deleted && (
                        <button onClick={() => doAction(app._id, "archive")}>
                          <Archive size={13} /> {app.archived ? "Unarchive" : "Archive"}
                        </button>
                      )}
                      {!app.deleted && (
                        <button className="danger" onClick={() => doAction(app._id, "trash")}>
                          <Trash2 size={13} /> Move to trash
                        </button>
                      )}
                      {app.deleted && (
                        <>
                          <button onClick={() => doAction(app._id, "restore")}>
                            <RotateCcw size={13} /> Restore
                          </button>
                          <button className="danger" onClick={() => {
                            if (window.confirm("Delete forever? This cannot be undone.")) {
                              doAction(app._id, "delete");
                            }
                          }}>
                            <Trash2 size={13} /> Delete forever
                          </button>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ApplicationsTab;
