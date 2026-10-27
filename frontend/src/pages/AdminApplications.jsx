import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Search, Briefcase, Clock3, MapPin, CheckCircle2, Eye, MessageCircle, XCircle, FileText, Sparkles, Send, Loader2, ChevronDown, MessageSquare } from "lucide-react";
import api from "../api/axios";
import LoadingDots from "../components/LoadingDots";

const STATUSES = ["all", "replied", "applied", "viewed", "shortlisted", "interview", "rejected"];

function statusMeta(status) {
  switch (status) {
    case "shortlisted": return { color: "#10b981", label: "Shortlisted",  icon: CheckCircle2 };
    case "interview":   return { color: "#a855f7", label: "Interview",    icon: MessageCircle };
    case "viewed":      return { color: "#6366f1", label: "Viewed",       icon: Eye };
    case "rejected":    return { color: "#ef4444", label: "Rejected",     icon: XCircle };
    default:            return { color: "#94a3b8", label: "Applied",      icon: Briefcase };
  }
}

function timeAgo(d) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}

// Group applications by userId
function groupByUser(apps) {
  const map = new Map();
  for (const a of apps) {
    const uid = String(a.userId?._id || a.userId || "unknown");
    if (!map.has(uid)) {
      map.set(uid, {
        userId: uid,
        user: a.userId || {},
        apps: [],
        latest: a,
      });
    }
    const g = map.get(uid);
    g.apps.push(a);
    if (new Date(a.createdAt) > new Date(g.latest.createdAt)) g.latest = a;
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.latest.createdAt) - new Date(a.latest.createdAt)
  );
}

function AdminApplications({ setPage }) {
  const [rawApps, setRawApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [detailLoadingId, setDetailLoadingId] = useState(null);
  const [replyOpenFor, setReplyOpenFor] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const listRef = useRef(null);

  // Load ALL applications in one go (391 isn't huge)
  const loadAll = async () => {
    setLoading(true);
    try {
      const r = await api.get("/admin/applications", { params: { page: 1, limit: 500, status: "all" } });
      setRawApps(r.data.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // Realtime: update status live
  useEffect(() => {
    const onUpdate = (e) => {
      const d = e.detail || {};
      setRawApps(prev => prev.map(a =>
        String(a._id) === String(d.applicationId) ? { ...a, status: d.status } : a
      ));
    };
    window.addEventListener("socket-application-updated", onUpdate);
    return () => window.removeEventListener("socket-application-updated", onUpdate);
  }, []);

  // Filter + group (client-side, instant)
  const groups = useMemo(() => {
    let filtered = rawApps;
    if (filterStatus === "replied") {
      // only apps that have at least one reply from the user
      filtered = filtered.filter(a =>
        Array.isArray(a.replies) && a.replies.some(r => r.from === "user")
      );
    } else if (filterStatus !== "all") {
      filtered = filtered.filter(a => a.status === filterStatus);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      filtered = filtered.filter(a =>
        (a.userId?.name || "").toLowerCase().includes(q) ||
        (a.userId?.email || "").toLowerCase().includes(q) ||
        (a.jobId?.title || "").toLowerCase().includes(q) ||
        (a.jobId?.company || "").toLowerCase().includes(q) ||
        (a.companyName || "").toLowerCase().includes(q)
      );
    }
    return groupByUser(filtered);
  }, [rawApps, filterStatus, query]);

  const selected = useMemo(
    () => groups.find(g => g.userId === selectedUserId) || null,
    [groups, selectedUserId]
  );

  // Auto-select first group on load
  useEffect(() => {
    if (!selectedUserId && groups.length > 0) {
      setSelectedUserId(groups[0].userId);
    }
  }, [groups, selectedUserId]);

  const changeStatus = async (appId, newStatus) => {
    setStatusUpdatingId(appId);
    try {
      await api.put(`/admin/applications/${appId}/status`, { status: newStatus });
      setRawApps(prev => prev.map(a => String(a._id) === String(appId) ? { ...a, status: newStatus } : a));
    } catch (e) {
      alert(e.response?.data?.message || "Failed to update status");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const sendReply = async (app) => {
    if (!replyText.trim() || !app) return;
    setReplying(true);
    try {
      await api.post(`/admin/applications/${app._id}/reply`, { text: replyText.trim() });
      setReplyText("");
      setReplyOpenFor(null);
      alert(`✅ Message sent to ${app.userId?.name || "applicant"} as ${app.jobId?.company || app.companyName || "company"}`);
    } catch (e) {
      alert(e.response?.data?.message || "Failed to send");
    } finally {
      setReplying(false);
    }
  };

  return (
    <div className="admin-apps-page">
      {/* LEFT */}
      <aside className="admin-apps-list">
        <div className="admin-apps-list-head">
          <button className="admin-apps-back" onClick={() => setPage("profile")}>
            <ArrowLeft size={16} />
          </button>
          <div className="admin-apps-title">Applications</div>
          <div className="admin-apps-count">{rawApps.length}</div>
        </div>

        <div className="admin-apps-search">
          <Search size={14} />
          <input
            placeholder="Search name, email, job, company…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div className="admin-apps-tabs">
          {STATUSES.map(s => (
            <button
              key={s}
              className={`admin-apps-tab ${filterStatus === s ? "active" : ""}`}
              onClick={() => setFilterStatus(s)}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="admin-apps-scroll" ref={listRef}>
          {loading ? (
            <div className="flex justify-center mt-10"><LoadingDots /></div>
          ) : groups.length === 0 ? (
            <div className="admin-apps-empty">No applications</div>
          ) : (
            groups.map(g => {
              const active = g.userId === selectedUserId;
              const s = statusMeta(g.latest.status);
              const SIcon = s.icon;
              return (
                <button
                  key={g.userId}
                  className={`admin-apps-row ${active ? "active" : ""}`}
                  onClick={() => setSelectedUserId(g.userId)}
                >
                  <div className="admin-apps-avatar sm">
                    {g.user?.profilePicture
                      ? <img src={g.user.profilePicture} alt="" />
                      : (g.user?.name?.[0] || "?")}
                  </div>
                  <div className="admin-apps-row-mid">
                    <div className="admin-apps-row-name">{g.user?.name || "Unknown"}</div>
                    <div className="admin-apps-row-job">
                      {g.apps.length} application{g.apps.length > 1 ? "s" : ""} · latest {timeAgo(g.latest.createdAt)}
                    </div>
                    <div className="admin-apps-row-latest">
                      {g.latest.jobId?.title || "Job"} · {g.latest.jobId?.company || g.latest.companyName || "—"}
                    </div>
                    {(() => {
                      const total = g.apps.reduce((n, a) => n + ((a.replies && a.replies.length) || 0), 0);
                      if (total === 0) return null;
                      return (
                        <div className="admin-apps-row-replies">
                          <MessageSquare size={10} /> {total}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="admin-apps-row-status" style={{ color: s.color }}>
                    <SIcon size={12} />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* RIGHT */}
      <section className="admin-apps-detail">
        {!selected ? (
          <div className="admin-apps-placeholder">
            <Briefcase size={30} />
            <p>Select an applicant to view</p>
          </div>
        ) : (
          <div className="admin-apps-detail-inner">
            {/* Applicant header */}
            <div className="admin-apps-detail-head">
              <div className="admin-apps-avatar lg">
                {selected.user?.profilePicture
                  ? <img src={selected.user.profilePicture} alt="" />
                  : (selected.user?.name?.[0] || "?")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="admin-apps-detail-title">{selected.user?.name || "Unknown"}</div>
                <div className="admin-apps-detail-sub">
                  {selected.user?.email || "—"}
                  {selected.user?.location ? ` · ${selected.user.location}` : ""}
                </div>
              </div>
            </div>

            {/* Summary chips */}
            <div className="admin-apps-chips">
              <span className="admin-apps-chip">{selected.apps.length} application{selected.apps.length > 1 ? "s" : ""}</span>
              {(() => {
                const counts = {};
                selected.apps.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1; });
                return Object.entries(counts).map(([st, n]) => {
                  const m = statusMeta(st);
                  return <span key={st} className="admin-apps-chip" style={{ color: m.color }}>{m.label}: {n}</span>;
                });
              })()}
            </div>

            {/* All their applications stacked */}
            <div className="admin-apps-apps-list">
              {selected.apps.map(app => {
                const s = statusMeta(app.status);
                const SIcon = s.icon;
                const replyingHere = replyOpenFor === app._id;
                const updating = statusUpdatingId === app._id;
                return (
                  <div key={app._id} className="admin-apps-app-card">
                    <div className="admin-apps-app-top">
                      <div className="admin-apps-app-icon"><Briefcase size={16} /></div>
                      <div className="min-w-0 flex-1">
                        <div className="admin-apps-app-title">{app.jobId?.title || "Job"}</div>
                        <div className="admin-apps-app-sub">
                          {app.jobId?.company || app.companyName || "—"}
                          {app.jobId?.location ? ` · ${app.jobId.location}` : ""}
                        </div>
                      </div>
                      <div className="admin-apps-app-status" style={{ color: s.color }}>
                        <SIcon size={12} />
                        <span>{s.label}</span>
                      </div>
                    </div>

                    <div className="admin-apps-app-meta">
                      <span><Clock3 size={11} /> {timeAgo(app.createdAt)}</span>
                      {app.matchPercentage ? <span className="match"><Sparkles size={11} /> {app.matchPercentage}%</span> : null}
                      {app.method ? <span>via {app.method}</span> : null}
                    </div>

                    {app.message ? (
                      <div className="admin-apps-app-cover">
                        <div className="admin-apps-label">Cover letter</div>
                        <div className="admin-apps-text-sm">{app.message}</div>
                      </div>
                    ) : null}

                    {(app.cvAttachmentUrl || app.cvAttachmentName || app.cvName) ? (
                      <a
                        href={app.cvAttachmentUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="admin-apps-file"
                      >
                        <FileText size={13} />
                        {app.cvAttachmentName || app.cvName || "cv.pdf"}
                      </a>
                    ) : null}

                    {app.replies && app.replies.length > 0 ? (
                      <div className="admin-apps-app-thread">
                        <div className="admin-apps-label">Conversation</div>
                        <div className="admin-apps-thread">
                          {app.replies.map((r, ri) => {
                            const isCompany = r.from === "company";
                            const name = r.senderName || (isCompany ? (app.jobId?.company || app.companyName || "Company") : "Applicant");
                            const ini = (name[0] || "?").toUpperCase();
                            return (
                              <div key={r._id || ri} className="admin-apps-thread-row">
                                <div className={`admin-apps-thread-avatar ${isCompany ? "company" : "user"}`}>{ini}</div>
                                <div className="admin-apps-thread-content">
                                  <div className="admin-apps-thread-head">
                                    <span className="admin-apps-thread-name">{name}</span>
                                    <span className="admin-apps-thread-time">{timeAgo(r.createdAt)}</span>
                                  </div>
                                  <div className="admin-apps-thread-body">{r.text}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    <div className="admin-apps-app-actions">
                      <select
                        value={app.status}
                        onChange={e => changeStatus(app._id, e.target.value)}
                        disabled={updating}
                        className="admin-apps-select sm"
                      >
                        <option value="applied">Applied</option>
                        <option value="viewed">Viewed</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="interview">Interview</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      <button
                        className="admin-apps-btn"
                        onClick={() => {
                          setReplyOpenFor(replyingHere ? null : app._id);
                          setReplyText("");
                        }}
                      >
                        <MessageCircle size={13} />
                        {replyingHere ? "Cancel" : "Reply"}
                      </button>
                    </div>

                    {replyingHere ? (
                      <div className="admin-apps-reply-box">
                        <textarea
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder={`Write as ${app.jobId?.company || app.companyName || "company"}…`}
                          rows={3}
                          className="admin-apps-reply"
                        />
                        <button
                          className="primary-button"
                          disabled={replying || !replyText.trim()}
                          onClick={() => sendReply(app)}
                        >
                          {replying ? <Loader2 size={13} className="spin" /> : <Send size={13} />}
                          {replying ? "Sending…" : "Send"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminApplications;
