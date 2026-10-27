import React, { useEffect, useState } from "react";
import {
  ArrowLeft, Briefcase, Clock3, MapPin, CheckCircle2, Eye,
  MessageCircle, XCircle, FileText, Sparkles, Loader2, Reply, Forward, Check,
} from "lucide-react";
import api from "../api/axios";
import LoadingDots from "../components/LoadingDots";
import PremiumModal from "../components/PremiumModal";
import { useAuth } from "../context/AuthContext";

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

function statusMeta(status) {
  switch (status) {
    case "shortlisted": return { color: "#10b981", label: "Shortlisted",  icon: CheckCircle2 };
    case "interview":   return { color: "#a855f7", label: "Interview",    icon: MessageCircle };
    case "viewed":      return { color: "#6366f1", label: "Under review", icon: Eye };
    case "rejected":    return { color: "#ef4444", label: "Not selected", icon: XCircle };
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

function dayLabel(d) {
  const date = new Date(d);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  if (sameDay) return "Today";
  const yest = new Date(today); yest.setDate(today.getDate() - 1);
  if (date.toDateString() === yest.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function ApplicationDetailScreen({ setPage }) {
  const { user } = useAuth();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showWaitingHint, setShowWaitingHint] = useState(false);

  const appId = sessionStorage.getItem("open_application_id");

  const load = () => {
    if (!appId) { setError("No application selected"); setLoading(false); return; }
    return api.get(`/jobs/applications/${appId}`)
      .then(r => setApp(r.data))
      .catch(e => setError(e.response?.data?.message || "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    if (appId) api.put(`/jobs/applications/${appId}/thread-seen`).catch(() => {});
    // eslint-disable-next-line
  }, [appId]);

  useEffect(() => {
    const onReply = (e) => {
      const d = e.detail || {};
      if (String(d.applicationId) !== String(appId)) return;
      load();
    };
    window.addEventListener("socket-application-reply", onReply);
    window.addEventListener("socket-application-updated", onReply);
    return () => {
      window.removeEventListener("socket-application-reply", onReply);
      window.removeEventListener("socket-application-updated", onReply);
    };
    // eslint-disable-next-line
  }, [appId]);

  const hasHrAccess = () => {
    const u = user || {};
    if (!u.subscriptionTier) return false;
    const exp = u.subscriptionExpiresAt || u.premiumExpiresAt;
    if (exp && new Date(exp) < new Date()) return false;
    return u.subscriptionTier === "plus" || u.subscriptionTier === "pro";
  };

  const handleReplyTap = () => {
    const hasCompanyReply = (app?.replies || []).some(r => r.from === "company");
    if (hasHrAccess()) {
      sessionStorage.setItem("reply_target_app", appId);
      sessionStorage.setItem("reply_target_company", app?.jobId?.company || app?.companyName || "");
      sessionStorage.setItem("reply_target_job", app?.jobId?.title || "Job");
      setPage("reply-composer");
      return;
    }
    if (!hasCompanyReply) {
      setShowWaitingHint(true);
      setTimeout(() => setShowWaitingHint(false), 4500);
      return;
    }
    setShowPremiumModal(true);
  };

  const handleForward = () => {
    // Coming soon — show soft toast
    setShowWaitingHint(true);
    setTimeout(() => setShowWaitingHint(false), 3000);
  };

  if (loading) {
    return <div className="page-scroll"><div className="page-container"><div className="flex justify-center mt-10"><LoadingDots /></div></div></div>;
  }
  if (error || !app) {
    return (
      <div className="page-scroll"><div className="page-container">
        <button className="text-slate-500 flex items-center gap-2 mb-5" onClick={() => setPage("inbox")}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="text-sm text-red-400">{error || "Not found"}</div>
      </div></div>
    );
  }

  const s = statusMeta(app.status);
  const StatusIcon = s.icon;
  const job = app.jobId || {};
  const company = job.company || app.companyName || "Company";
  const initial = (company[0] || "?").toUpperCase();
  const bg = colorFor(company);
  const cvName = app.cvAttachmentName || app.cvName;
  const cvUrl = app.cvAttachmentUrl;

  // Build the full message list — original application first, then replies
  const messages = [
    {
      _id: "original-application",
      from: "user",
      senderName: "You",
      text: app.message,
      createdAt: app.createdAt,
      isOriginal: true,
      cvName,
      cvUrl,
      verified: false,
    },
    ...(app.replies || []).map(r => ({ ...r, verified: r.from === "company" })),
  ];

  const hasCompanyReply = messages.some(m => m.from === "company");

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button className="text-slate-500 flex items-center gap-2 mb-5" onClick={() => setPage("inbox")}>
          <ArrowLeft size={16} /> Back
        </button>

        <div className="app-detail-header">
          <div className="app-detail-avatar" style={{ background: bg }}>{initial}</div>
          <div className="min-w-0">
            <div className="page-title truncate">
              {company}
              {hasCompanyReply ? <span className="verified-check" title="Verified employer"><Check size={11} strokeWidth={3} /></span> : null}
            </div>
            <div className="page-subtitle">{job.title || "Job"}</div>
          </div>
        </div>

        <div className="app-detail-status" style={{ color: s.color }}>
          <StatusIcon size={14} />
          <span>{s.label}</span>
        </div>

        <div className="app-detail-meta">
          <span className="flex items-center gap-1">
            <Clock3 size={12} />Applied {new Date(app.createdAt).toLocaleString()}
          </span>
          {job.location ? (
            <span className="flex items-center gap-1"><MapPin size={12} />{job.location}</span>
          ) : null}
        </div>

        {/* THREAD — Gmail-style collapsible rows */}
        <div className="gmail-thread">
          {messages.map((msg, i) => {
            const isCompany = msg.from === "company";
            const name = msg.senderName || (isCompany ? company : "You");
            const isExpanded = expandedId === msg._id;
            const showDayHeader = i === 0 || dayLabel(messages[i-1].createdAt) !== dayLabel(msg.createdAt);

            return (
              <React.Fragment key={msg._id || i}>
                {showDayHeader ? (
                  <div className="gmail-day-header">
                    {dayLabel(msg.createdAt)} · {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                ) : null}

                <div
                  className={`gmail-msg ${isExpanded ? "expanded" : ""} ${isCompany ? "from-company" : "from-me"}`}
                  onClick={() => setExpandedId(isExpanded ? null : msg._id)}
                >
                  <div className="gmail-msg-head">
                    <div className="gmail-msg-avatar" style={{ background: isCompany ? colorFor(name) : "#6366f1" }}>
                      {(name[0] || "?").toUpperCase()}
                    </div>
                    <div className="gmail-msg-who">
                      <div className="gmail-msg-name">
                        {name}
                        {msg.verified ? <span className="verified-check"><Check size={10} strokeWidth={3} /></span> : null}
                      </div>
                      <div className="gmail-msg-role">
                        {msg.isOriginal ? "Applied" : (isCompany ? "Company" : "You")}
                      </div>
                    </div>
                    <div className="gmail-msg-time">{timeAgo(msg.createdAt)}</div>
                  </div>

                  {!isExpanded ? (
                    <div className="gmail-msg-preview">
                      {msg.text ? msg.text.split("\n")[0].slice(0, 80) : ""}
                    </div>
                  ) : (
                    <div className="gmail-msg-body">
                      <div className="gmail-msg-meta">
                        <div><span className="gmail-label">From</span> {name}</div>
                        <div><span className="gmail-label">To</span> {isCompany ? "You" : company}</div>
                        {job.title ? <div><span className="gmail-label">Re</span> {job.title}</div> : null}
                      </div>
                      <div className="gmail-msg-text">{msg.text}</div>
                      {msg.cvName ? (
                        <a
                          className="gmail-attachment"
                          href={msg.cvUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                        >
                          <FileText size={13} /> {msg.cvName}
                        </a>
                      ) : null}
                      <div className="gmail-msg-actions">
                        <button
                          className="gmail-mini-btn"
                          onClick={(e) => { e.stopPropagation(); handleReplyTap(); }}
                        >
                          <Reply size={12} /> Reply
                        </button>
                        <button
                          className="gmail-mini-btn"
                          onClick={(e) => { e.stopPropagation(); handleForward(); }}
                        >
                          <Forward size={12} /> Forward
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}

          {!hasCompanyReply ? (
            <div className="gmail-empty-hint">
              No reply yet. We'll notify you when they respond.
            </div>
          ) : null}
        </div>

        {/* GLOBAL REPLY / FORWARD ROW */}
        <div className="gmail-action-row">
          <button
            className={`gmail-action-btn ${!hasCompanyReply && !hasHrAccess() ? "dim" : ""}`}
            onClick={handleReplyTap}
          >
            <Reply size={14} /> Reply
          </button>
          <button className="gmail-action-btn" onClick={handleForward}>
            <Forward size={14} /> Forward
          </button>
        </div>

        {showWaitingHint ? (
          <div className="gmail-hint-toast">
            {hasCompanyReply
              ? "Forward is coming soon."
              : `⏳ No message from ${company} yet. We'll notify you the moment they reply.`}
          </div>
        ) : null}

        {showPremiumModal ? (
          <PremiumModal
            onClose={() => setShowPremiumModal(false)}
            reason="reply to companies"
            mode="hr-reply"
          />
        ) : null}
      </div>
    </div>
  );
}
