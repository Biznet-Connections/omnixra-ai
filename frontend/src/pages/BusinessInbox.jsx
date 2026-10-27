import React, { useEffect, useState } from "react";
import { MessageCircle, Package, Briefcase } from "lucide-react";
import api from "../api/axios";
import LoadingDots from "../components/LoadingDots";

export default function BusinessInbox({ setPage }) {
  const [tab, setTab] = useState("products");
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    api.get("/messages")
      .then(r => setConversations(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-scroll">
      <div className="page-container">
        <h1 className="text-lg font-bold text-white mb-4">Inbox</h1>

        <div className="biz-inbox-tabs">
          <button
            className={`biz-inbox-tab ${tab === "products" ? "active" : ""}`}
            onClick={() => setTab("products")}
          >
            <Package size={14} /> Product Qs
          </button>
          <button
            className={`biz-inbox-tab ${tab === "hiring" ? "active" : ""}`}
            onClick={() => setTab("hiring")}
          >
            <Briefcase size={14} /> Hiring
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center mt-10"><LoadingDots /></div>
        ) : conversations.length === 0 ? (
          <div className="biz-inbox-empty">
            <MessageCircle size={48} className="text-slate-600 mx-auto mb-3" />
            <h2 className="text-sm font-bold text-white mb-1">
              {tab === "products" ? "No customer messages yet" : "No hiring messages yet"}
            </h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {tab === "products"
                ? "When customers ask about your products, their messages will appear here."
                : "When job seekers apply or ask about jobs you posted, they'll appear here."}
            </p>
          </div>
        ) : (
          <div className="biz-inbox-list">
            {conversations.map(c => (
              <button
                key={c._id}
                className="biz-inbox-row"
                onClick={() => {
                  sessionStorage.setItem("open_conversation_id", c._id);
                  setPage("inbox-thread");
                }}
              >
                <div className="biz-inbox-row-avatar">
                  {(c.participants?.[0]?.name?.[0] || "?").toUpperCase()}
                </div>
                <div className="biz-inbox-row-body">
                  <div className="biz-inbox-row-name">
                    {c.participants?.[0]?.name || "Customer"}
                  </div>
                  <div className="biz-inbox-row-preview">
                    {c.messages?.[c.messages.length - 1]?.text?.slice(0, 50) || "No messages"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
