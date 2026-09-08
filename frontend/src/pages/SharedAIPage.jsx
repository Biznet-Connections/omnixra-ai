import React, { useEffect, useState } from "react";
import { Sparkles, ArrowLeft, Share2, Copy, Check } from "lucide-react";
import api from "../api/axios";
import LoadingDots from "../components/LoadingDots";

function SharedAIPage({ chatId, setPage }) {
  const [chat, setChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (chatId) {
      api.get(`/ai/shared/${chatId}`)
        .then(res => {
          setChat(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [chatId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(chat?.response || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/share/ai/${chatId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Omnixra AI Response",
          text: chat?.response?.substring(0, 150) || "Check this AI response",
          url
        });
      } catch (err) { console.error(err); }
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  if (loading) {
    return (
      <div className="page-scroll">
        <div className="page-container flex justify-center mt-10">
          <LoadingDots />
        </div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="page-scroll">
        <div className="page-container">
          <div className="empty-state">Shared AI response not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-scroll">
      <div className="page-container max-w-2xl mx-auto">
        <button onClick={() => setPage("home")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="shared-ai-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="ai-avatar-small"><Sparkles size={16} /></div>
            <div>
              <div className="text-sm font-semibold">Omnixra AI</div>
              <div className="text-[10px] text-slate-600">{new Date(chat.createdAt).toLocaleDateString()}</div>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-xs text-slate-500 mb-2">Question:</div>
            <div className="user-message">{chat.message}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-2">AI Response:</div>
            <div className="ai-message-text">{chat.response}</div>
          </div>

          <div className="flex gap-2 mt-5">
            <button onClick={handleShare} className="outline-button flex items-center gap-2">
              <Share2 size={14} /> Share
            </button>
            <button onClick={handleCopy} className="outline-button flex items-center gap-2">
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default SharedAIPage;
