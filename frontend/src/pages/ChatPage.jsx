import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Plus, Paperclip, Mic, ThumbsUp, ThumbsDown, Copy, Check, Share2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import JobCard from "../components/JobCard";
import TalentCard from "../components/TalentCard";

function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([{ role: "assistant", text: user?.accountType === "company" ? `Hello ${user?.name} 👋\n\nTell me the job you are posting, or the employees you are looking for.` : "Hey 👋 I'm Omnixra, your AI employment assistant. I can find jobs, improve CV, and help with your career." }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [copied, setCopied] = useState(null);
  const [shared, setShared] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);

  const sendMessage = async (provided) => {
    const text = (provided ?? input).trim();
    if (!text) return;
    setMessages(prev => [...prev, { role: "user", text }]);
    setInput("");
    setTyping(true);
    try {
      if (user?.accountType === "company") {
        const res = await api.post("/ai/talent", { query: text });
        setMessages(prev => [...prev, { role: "assistant", text: res.data.text, talent: res.data.talent, chatId: res.data.chatId }]);
      } else if (text.toLowerCase().includes("job") || text.toLowerCase().includes("work") || text.toLowerCase().includes("vacancy") || text.toLowerCase().includes("career")) {
        const res = await api.post("/ai/jobs", { query: text });
        setMessages(prev => [...prev, { role: "assistant", text: res.data.text, jobs: res.data.jobs }]);
      } else {
        const chatHistory = messages.filter(m => m.text).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }));
        chatHistory.push({ role: "user", content: text });
        const res = await api.post("/ai/chat", { messages: chatHistory });
        setMessages(prev => [...prev, { role: "assistant", text: res.data.text, chatId: res.data.chatId }]);
      }
    } catch (err) { setMessages(prev => [...prev, { role: "assistant", text: "I'm having trouble. Please try again." }]); }
    finally { setTyping(false); }
  };

  const getSuggestions = () => {
    const category = user?.category || "General";
    if (user?.accountType === "company") return ["Find employees", "Post a job", "Find talent"];
    const cat = category.toLowerCase();
    if (cat.includes("network") || cat.includes("it") || cat.includes("software")) return ["Find networking jobs", "Improve my CV", "Find IT jobs"];
    if (cat.includes("account") || cat.includes("finance")) return ["Find accounting jobs", "Improve my CV", "Find finance roles"];
    if (cat.includes("plumb")) return ["Find plumbing jobs", "Improve my CV", "Find construction jobs"];
    if (cat.includes("electric")) return ["Find electrical jobs", "Improve my CV", "Find maintenance jobs"];
    if (cat.includes("house") || cat.includes("clean")) return ["Find housekeeping jobs", "Improve my CV", "Find domestic jobs"];
    if (cat.includes("garden")) return ["Find gardening jobs", "Improve my CV", "Find outdoor jobs"];
    return ["Find jobs for me", "Improve my CV", "Find remote jobs"];
  };

  const suggestions = getSuggestions();

  const copyText = (text) => { navigator.clipboard.writeText(text); setCopied(text); setTimeout(() => setCopied(null), 1500); };

  const handleShare = async (message) => {
    try {
      let shareUrl = "";
      let chatId = message.chatId;

      // If no chatId, create a chat record first
      if (!chatId) {
        const createRes = await api.post("/ai/chat", {
          messages: [
            { role: "user", content: "Share this" },
            { role: "assistant", content: message.text }
          ]
        });
        chatId = createRes.data.chatId;
      }

      // Now share via API
      const res = await api.post(`/ai/share/${chatId}`);
      shareUrl = `${window.location.origin}${res.data.shareUrl}`;

      const shareText = `Omnixra AI:\n${message.text?.substring(0, 150) || "Check this AI response"}\n\n${shareUrl}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: "Omnixra AI Response",
            text: `${message.text?.substring(0, 150) || "Check this AI response"}\n\n${shareUrl}`,
            url: shareUrl
          });
        } catch (err) { console.error(err); }
      } else {
        await navigator.clipboard.writeText(shareText);
        setShared(message.text);
        setTimeout(() => setShared(null), 1500);
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="chat-page">
      <div className="chat-scroll">
        <div className="chat-container">
          <div className="chat-welcome">
            <div className="welcome-orb float"><Sparkles size={25} /></div>
            <h1>What can Omnixra do for you?</h1>
            <p>{user?.accountType === "company" ? "Post jobs, discover talent, and manage applications." : "Search opportunities, improve your career and more."}</p>
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
                <div key={i} className="flex justify-end fade-up"><div className="user-message">{message.text}</div></div>
              )
            ))}
            {typing && <div className="flex gap-3 fade-up"><div className="ai-avatar-small"><Sparkles size={16} /></div><div className="typing-bubble"><span /><span /><span /></div></div>}
            <div ref={bottomRef} />
          </div>
        </div>
      </div>
      <div className="chat-composer-area">
        <div className="suggestion-row">{suggestions.map(prompt => <button key={prompt} onClick={() => sendMessage(prompt)} className="suggestion-chip"><Sparkles size={11} />{prompt}</button>)}</div>
        <div className="chat-composer">
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Ask Omnixra anything..." rows={2} />
          <div className="composer-bottom">
            <div className="flex gap-1"><button className="composer-icon"><Plus size={17} /></button><button className="composer-icon"><Paperclip size={16} /></button><button className="composer-icon"><Mic size={16} /></button></div>
            <button onClick={() => sendMessage()} className="send-button"><Send size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default ChatPage;
