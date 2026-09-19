import React, { useEffect, useState } from "react";
import { ArrowLeft, MessageCircle, User, Briefcase, FileText, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import LoadingDots from "../components/LoadingDots";

function CompanyInboxPage({ setPage, setSelectedUserId }) {
  const { user } = useAuth();
  const [tab, setTab] = useState("messages"); // messages | applicants
  const [conversations, setConversations] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [convRes, appRes] = await Promise.all([
          api.get("/messages").catch(() => ({ data: [] })),
          api.get("/jobs/applicants/me").catch(() => ({ data: [] })),
        ]);
        if (!cancelled) {
          setConversations(convRes.data || []);
          setApplicants(appRes.data || []);
        }
      } catch (e) {
        console.warn("[CompanyInbox] load failed:", e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery) return true;
    const other = c.participants?.find(p => p._id !== user?._id);
    const name = other?.name?.toLowerCase() || "";
    return name.includes(searchQuery.toLowerCase());
  });

  const filteredApplicants = applicants.filter(a => {
    if (!searchQuery) return true;
    const name = a.userId?.name?.toLowerCase() || "";
    const job = a.jobId?.title?.toLowerCase() || "";
    return name.includes(searchQuery.toLowerCase()) || job.includes(searchQuery.toLowerCase());
  });

  const openConversation = (conv) => {
    // Store the conversation ID and go to full chat
    if (conv?._id) {
      sessionStorage.setItem("openConversationId", conv._id);
    }
    setPage("inbox-chat");
  };

  const openApplicant = (app) => {
    setSelectedUserId?.(app.userId?._id);
    setPage("user-profile");
  };

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button onClick={() => setPage("home")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
          <ArrowLeft size={16} /> Back
        </button>

        <h1 className="page-title">Company Inbox</h1>
        <p className="page-subtitle">Messages and applications in one place.</p>

        {/* Search */}
        <div className="mt-5 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name or job..."
            className="form-input pl-9"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 mb-5">
          <button
            onClick={() => setTab("messages")}
            className={"outline-button flex-1 " + (tab === "messages" ? "category-active" : "")}
          >
            <MessageCircle size={13} /> Messages
            {conversations.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[.06]">{conversations.length}</span>
            )}
          </button>
          <button
            onClick={() => setTab("applicants")}
            className={"outline-button flex-1 " + (tab === "applicants" ? "category-active" : "")}
          >
            <FileText size={13} /> Applicants
            {applicants.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[.06]">{applicants.length}</span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center mt-10"><LoadingDots /></div>
        ) : tab === "messages" ? (
          filteredConversations.length === 0 ? (
            <div className="empty-state mt-7">
              <div className="empty-icon"><MessageCircle size={24} /></div>
              <h2 className="text-sm font-semibold mt-4">No messages yet</h2>
              <p className="text-xs text-slate-700 mt-2">Jobseekers who message you will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredConversations.map(conv => {
                const other = conv.participants?.find(p => p._id !== user?._id);
                const last = conv.messages?.[conv.messages.length - 1];
                const lastText = last?.text || conv.lastMessage || "Start a conversation";
                return (
                  <button
                    key={conv._id}
                    onClick={() => openConversation(conv)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/[.06] bg-white/[.02] hover:border-white/[.15] transition-colors text-left"
                  >
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 text-sm font-bold overflow-hidden">
                      {other?.profilePicture ? (
                        <img src={other.profilePicture} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        other?.name?.[0]?.toUpperCase() || "U"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{other?.name || "User"}</div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">{lastText}</div>
                    </div>
                    <div className="text-[10px] text-slate-600 flex-shrink-0">
                      {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString() : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          )
        ) : (
          filteredApplicants.length === 0 ? (
            <div className="empty-state mt-7">
              <div className="empty-icon"><FileText size={24} /></div>
              <h2 className="text-sm font-semibold mt-4">No applications yet</h2>
              <p className="text-xs text-slate-700 mt-2">Post a job to start receiving applications.</p>
              <button onClick={() => setPage("post-job")} className="primary-button mt-4">Post a Job</button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredApplicants.map(app => (
                <button
                  key={app._id}
                  onClick={() => openApplicant(app)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/[.06] bg-white/[.02] hover:border-white/[.15] transition-colors text-left"
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 text-sm font-bold overflow-hidden">
                    {app.userId?.profilePicture ? (
                      <img src={app.userId.profilePicture} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      app.userId?.name?.[0]?.toUpperCase() || "U"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{app.userId?.name || "Applicant"}</div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      <Briefcase size={10} className="inline mr-1" />
                      {app.jobId?.title || "Job"}
                    </div>
                  </div>
                  {app.matchPercentage ? (
                    <div className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold flex-shrink-0">
                      {app.matchPercentage}%
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default CompanyInboxPage;
