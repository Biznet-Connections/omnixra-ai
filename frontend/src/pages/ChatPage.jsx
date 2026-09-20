import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Paperclip, Mic, ThumbsUp, ThumbsDown, Copy, Check, Share2, Menu } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import JobCard from "../components/JobCard";
import TalentCard from "../components/TalentCard";
import ChatHistorySidebar from "../components/ChatHistorySidebar";

function ChatPage() {
  const { user } = useAuth();
  const isCompany = user?.accountType === "company";

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: isCompany
        ? `Hello ${user?.name} 👋\n\nTell me the job you're hiring for, or the kind of person you're looking for.`
        : `Hey 👋 I'm Omnixra, your AI employment assistant. I can find jobs, improve your CV, and help you build your career.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [copied, setCopied] = useState(null);
  const [shared, setShared] = useState(null);
  const [chatAttachments, setChatAttachments] = useState([]);
  const [uploadingChat, setUploadingChat] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);

  // Auto-send prompt from elsewhere (CompanyCard "Ask AI" etc.)
  useEffect(() => {
    const pending = sessionStorage.getItem("ai_auto_prompt");
    if (!pending) return;
    sessionStorage.removeItem("ai_auto_prompt");
    const t = setTimeout(() => { sendMessage(pending); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChatFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { alert("File too large (max 25MB)"); return; }
    setUploadingChat(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const category = file.type.startsWith("image/") ? "image" : "file";
        const res = await api.post("/ai/upload", {
          fileData: reader.result,
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
          category,
        });
        setChatAttachments(prev => [...prev, res.data]);
      } catch (err) {
        alert(err.response?.data?.message || "Upload failed");
      } finally {
        setUploadingChat(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = async (provided) => {
    const text = (provided ?? input).trim();
    if (!text && chatAttachments.length === 0) return;

    const userMsg = { role: "user", text, attachments: chatAttachments };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setChatAttachments([]);
    setTyping(true);

    try {
      // Build chat history
      const chatHistory = [...messages, userMsg]
        .filter(m => m.text || m.attachments?.length)
        .map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text || "" }));
      chatHistory.push({ role: "user", content: text });

      // Route based on intent
      const lower = text.toLowerCase();
      if (isCompany && (lower.includes("candidate") || lower.includes("hire") || lower.includes("find") || lower.includes("talent") || lower.includes("recruit"))) {
        const res = await api.post("/ai/talent", { query: text });
        setMessages(prev => [...prev, { role: "assistant", text: res.data.text, talent: res.data.talent, chatId: res.data.chatId }]);
      } else if (!isCompany && (lower.includes("job") || lower.includes("work") || lower.includes("vacancy") || lower.includes("career") || lower.includes("basa") || lower.includes("umsebenzi"))) {
        const res = await api.post("/ai/jobs", { query: text });
        setMessages(prev => [...prev, { role: "assistant", text: res.data.text, jobs: res.data.jobs }]);
      } else {
        const res = await api.post("/ai/chat", { messages: chatHistory, chatId });
        setMessages(prev => [...prev, { role: "assistant", text: res.data.text, chatId: res.data.chatId }]);
        if (res.data.chatId) setChatId(res.data.chatId);
      }
    } catch (err) {
      const errMsg = !navigator.onLine
        ? "You're offline. Check your internet connection and try again."
        : (err.response?.data?.message || "I'm having trouble. Please try again in a moment.");
      setMessages(prev => [...prev, { role: "assistant", text: errMsg }]);
    } finally {
      setTyping(false);
    }
  };

  const loadChat = async (id) => {
    try {
      const res = await api.get(`/ai/chats/${id}`);
      const chat = res.data.chat;
      if (!chat) {
        alert("Chat not found");
        return;
      }

      // Handle new (messages[]) or legacy (message/response)
      let loaded = [];
      if (Array.isArray(chat.messages) && chat.messages.length > 0) {
        loaded = chat.messages.map(m => ({
          role: m.role === "user" ? "user" : "assistant",
          text: m.content || "",
          attachments: m.attachments || [],
        }));
      } else if (chat.message || chat.response) {
        // Legacy shape
        loaded = [];
        if (chat.message) loaded.push({ role: "user", text: chat.message });
        if (chat.response) loaded.push({ role: "assistant", text: chat.response });
      }

      if (loaded.length === 0) {
        alert("This chat is empty");
        return;
      }

      setMessages(loaded);
      setChatId(id);
    } catch (e) {
      alert(e.response?.data?.message || "Could not load chat");
    }
  };

  const newChat = () => {
    setChatId(null);
    setMessages([{
      role: "assistant",
      text: isCompany
        ? `Hello ${user?.name} 👋\n\nTell me the job you're hiring for, or the kind of person you're looking for.`
        : `Hey 👋 I'm Omnixra, your AI employment assistant. What can I help you with today?`,
    }]);
  };

  const getSuggestions = () => {
    if (isCompany) return ["Find candidates", "Draft a job post", "Analyze my talent pool", "Bulk message"];
    const category = (user?.category || "General").toLowerCase();
    if (category.includes("it") || category.includes("software") || category.includes("network")) return ["Find IT jobs", "Improve my CV", "Find remote jobs", "Create CV"];
    if (category.includes("account") || category.includes("finance")) return ["Find accounting jobs", "Improve my CV", "Find finance roles", "Create CV"];
    if (category.includes("teach") || category.includes("education")) return ["Find teaching jobs", "Improve my CV", "Create CV", "Career advice"];
    if (category.includes("clean") || category.includes("house")) return ["Find housekeeping jobs", "Improve my CV", "Create CV", "Jobs in Harare"];
    if (category.includes("plumb") || category.includes("electric") || category.includes("construct")) return ["Find trade jobs", "Improve my CV", "Create CV", "Find local jobs"];
    return ["Find jobs for me", "Improve my CV", "Find remote jobs", "Create CV"];
  };

  const suggestions = getSuggestions();

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleShare = async (message) => {
    try {
      let shareUrl = "";
      let id = message.chatId || chatId;
      if (!id) {
        const createRes = await api.post("/ai/chat", {
          messages: [{ role: "user", content: "Share this" }, { role: "assistant", content: message.text }],
        });
        id = createRes.data.chatId;
      }
      const res = await api.post(`/ai/share/${id}`);
      shareUrl = `${window.location.origin}${res.data.shareUrl}`;
      const shareText = `Omnixra AI:\n${message.text?.substring(0, 150) || "Check this AI response"}\n\n${shareUrl}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: "Omnixra AI Response", text: message.text?.substring(0, 150) || "", url: shareUrl });
        } catch (err) {}
      } else {
        await navigator.clipboard.writeText(shareText);
        setShared(message.text);
        setTimeout(() => setShared(null), 1500);
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="chat-page">
      {/* Floating hamburger — no header bar */}
      <button
        onClick={() => setShowHistory(true)}
        className="fixed top-3 left-3 z-40 p-2 rounded-lg bg-white/[.04] hover:bg-white/[.08] backdrop-blur-sm border border-white/[.06] transition-colors"
        aria-label="Open chat history"
      >
        <svg width="20" height="16" viewBox="0 0 20 16" fill="currentColor" className="text-white">
          <rect x="0" y="0" width="20" height="2.2" rx="1" />
          <rect x="0" y="6.9" width="14" height="2.2" rx="1" />
          <rect x="0" y="13.8" width="8" height="2.2" rx="1" />
        </svg>
      </button>

      <div className="chat-scroll">
        <div className="chat-container">
          <div className="chat-welcome">
            <div className="welcome-orb float"><Sparkles size={25} /></div>
            <h1>{isCompany ? "What kind of person are you hiring?" : "What can Omnixra do for you?"}</h1>
            <p>{isCompany ? "Find talent, draft job posts, and manage candidates with AI." : "Search opportunities, improve your career and more."}</p>
          </div>

          <div className="space-y-7 mt-9">
            {messages.map((message, i) => (
              message.role === "assistant" || message.role === "ai" ? (
                <div key={i} className="flex gap-3 fade-up">
                  <div className="ai-avatar-small"><Sparkles size={16} /></div>
                  <div className="flex-1 max-w-3xl">
                    <div className="text-[11px] text-slate-600 mb-1.5">Omnixra AI</div>
                    <div className="ai-message-text">{message.text}</div>
                    <div className="message-actions">
                      <button className="feedback-active"><ThumbsUp size={13} /></button>
                      <button onClick={() => copyText(message.text)}>{copied === message.text ? <Check size={13} /> : <Copy size={13} />}</button>
                      <button><ThumbsDown size={13} /></button>
                      <button onClick={() => handleShare(message)} className={shared === message.text ? "feedback-active" : ""}>
                        {shared === message.text ? <Check size={13} /> : <Share2 size={13} />}
                      </button>
                    </div>
                    {message.jobs && <div className="mt-5 space-y-3">{message.jobs.map(job => <JobCard key={job._id || job.company} job={job} />)}</div>}
                    {message.talent && <div className="mt-5 space-y-3">{message.talent.map(t => <TalentCard key={t._id} talent={t} />)}</div>}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-end fade-up">
                  <div className="user-message">
                    {message.text}
                    {message.attachments?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachments.map((a, j) => (
                          <a key={j} href={a.url} target="_blank" rel="noreferrer" className="text-[10px] underline opacity-70">
                            📎 {a.name || "attachment"}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            ))}
            {typing && <div className="flex gap-3 fade-up"><div className="ai-avatar-small"><Sparkles size={16} /></div><div className="typing-bubble"><span /><span /><span /></div></div>}
            <div ref={bottomRef} />
          </div>
        </div>
      </div>

      {/* Composer */}
      <div className="chat-composer-area">
        {chatAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pb-2">
            {chatAttachments.map((a, i) => (
              <div key={i} className="text-[10px] px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 flex items-center gap-1">
                📎 {a.name}
                <button onClick={() => setChatAttachments(prev => prev.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
          </div>
        )}
        <div className="suggestion-row">{suggestions.map(prompt => <button key={prompt} onClick={() => sendMessage(prompt)} className="suggestion-chip"><Sparkles size={11} />{prompt}</button>)}</div>
        <div className="chat-composer">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={isCompany ? "Ask about candidates, jobs, or hiring..." : "Ask Omnixra anything..."}
            rows={2}
          />
          <div className="composer-bottom">
            <div className="flex gap-1">
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingChat} className="composer-icon" title="Attach file">
                <Paperclip size={16} />
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleChatFile} />
              <button className="composer-icon" title="Voice (coming soon)"><Mic size={16} /></button>
            </div>
            <button onClick={() => sendMessage()} className="send-button"><Send size={16} /></button>
          </div>
        </div>
      </div>

      {/* History sidebar */}
      <ChatHistorySidebar
        open={showHistory}
        onClose={() => setShowHistory(false)}
        onLoad={loadChat}
        onNewChat={newChat}
        currentChatId={chatId}
      />
    </div>
  );
}
export default ChatPage;
