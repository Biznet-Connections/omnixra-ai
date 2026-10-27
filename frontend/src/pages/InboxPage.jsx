import React, { useState, useEffect } from "react";
import ApplicationsTab from "./ApplicationsTab";
import MessagesPane from "./MessagesPane";

function InboxPage({ setPage, initialConversationId }) {
  const [tab, setTab] = useState(() => {
    if (initialConversationId) return "messages";
    if (typeof window === "undefined") return "applications";
    return localStorage.getItem("omnixra_inbox_tab") || "applications";
  });

  useEffect(() => {
    if (initialConversationId) setTab("messages");
  }, [initialConversationId]);

  const switchTab = (t) => {
    setTab(t);
    try { localStorage.setItem("omnixra_inbox_tab", t); } catch {}
  };

  return (
    <div className="inbox-shell">
      <div className="inbox-tabs">
        <button
          className={`inbox-tab ${tab === "applications" ? "inbox-tab-active" : ""}`}
          onClick={() => switchTab("applications")}
        >
          Applications
        </button>
        <button
          className={`inbox-tab ${tab === "messages" ? "inbox-tab-active" : ""}`}
          onClick={() => switchTab("messages")}
        >
          Messages
        </button>
      </div>

      <div className="inbox-body">
        {tab === "applications" ? (
          <ApplicationsTab setPage={setPage} />
        ) : (
          <MessagesPane setPage={setPage} initialConversationId={initialConversationId} />
        )}
      </div>
    </div>
  );
}

export default InboxPage;
