import React, { useEffect, useState, useRef } from "react";
import { ArrowLeft, Send, Check, CheckCheck, Mic, Smile, Plus, Search, Lock, Image, FileText, Camera, User, X, MoreVertical, Ban, Unlock, Trash2 } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import LoadingDots from "../components/LoadingDots";

function InboxPage({ setPage }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUser, setTypingUser] = useState(null);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastSeen, setLastSeen] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showConversationMenu, setShowConversationMenu] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const { user } = useAuth();
  const { socket, onlineUsers, typingUsers, lastSeenMap, emitTyping, emitMarkRead } = useSocket();

  const EMOJIS = ["😊", "😂", "❤️", "👍", "🙏", "🎉", "🔥", "💯", "😮", "😢", "🤔", "👋", "😍", "🤗", "💪", "👏", "🙌", "✨", "💼", "📄"];

  useEffect(() => {
    fetchConversations();

    const handleNewMessage = (event) => {
      const { conversationId, message } = event.detail;
      if (selectedConversation?._id === conversationId) {
        setMessages(prev => {
          const exists = prev.some(m => m._id === message._id);
          if (exists) return prev;
          return [...prev, message];
        });
        emitMarkRead(conversationId, message.sender?._id);
        api.put(`/messages/${conversationId}/read`).catch(err => console.error(err));
      }
      fetchConversations();
    };

    const handleMessageRead = (event) => {
      const { conversationId, readerId } = event.detail;
      if (selectedConversation?._id === conversationId) {
        setMessages(prev => prev.map(msg => {
          if (!msg.readBy) msg.readBy = [];
          if (!msg.readBy.includes(readerId)) {
            msg.readBy.push(readerId);
          }
          return msg;
        }));
      }
    };

    const handleConversationDeleted = (event) => {
      const { conversationId } = event.detail;
      if (selectedConversation?._id === conversationId) {
        setSelectedConversation(null);
      }
      fetchConversations();
    };

    window.addEventListener("socket-new-message", handleNewMessage);
    window.addEventListener("socket-message-read", handleMessageRead);
    window.addEventListener("socket-conversation-deleted", handleConversationDeleted);

    return () => {
      window.removeEventListener("socket-new-message", handleNewMessage);
      window.removeEventListener("socket-message-read", handleMessageRead);
      window.removeEventListener("socket-conversation-deleted", handleConversationDeleted);
    };
  }, [selectedConversation?._id, user?._id]);

  useEffect(() => {
    const openConversationId = localStorage.getItem("omnixra_open_conversation");
    if (openConversationId) {
      localStorage.removeItem("omnixra_open_conversation");
      openConversation(openConversationId);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  useEffect(() => {
    if (selectedConversation) {
      const typingUserId = typingUsers[selectedConversation._id];
      setTypingUser(typingUserId || null);
      
      const otherParticipant = selectedConversation.participants?.find(p => p._id !== user?._id);
      if (otherParticipant) {
        api.get(`/messages/user/${otherParticipant._id}`)
          .then(res => {
            setLastSeen(res.data.lastSeen || res.data.updatedAt);
          })
          .catch(err => console.error(err));

        const blockedList = JSON.parse(localStorage.getItem("omnixra_blocked_users") || "[]");
        setIsBlocked(blockedList.includes(otherParticipant._id));
      }
    }
  }, [typingUsers, selectedConversation, user?._id]);

  useEffect(() => {
    if (selectedConversation) {
      const otherParticipant = selectedConversation.participants?.find(p => p._id !== user?._id);
      if (otherParticipant) {
        if (onlineUsers.has(otherParticipant._id)) {
          setLastSeen(null);
        } else if (lastSeenMap[otherParticipant._id]) {
          setLastSeen(lastSeenMap[otherParticipant._id]);
        }
      }
    }
  }, [onlineUsers, lastSeenMap, selectedConversation]);

  const fetchConversations = async () => {
    setLoadingConversations(true);
    try {
      const res = await api.get("/messages");
      setConversations(res.data);
    } catch (err) { console.error(err); }
    finally {
      setLoadingConversations(false);
    }
  };

  const openConversation = async (conversationId) => {
    try {
      const res = await api.get(`/messages/${conversationId}`);
      setSelectedConversation(res.data);
      setMessages(res.data.messages || []);
      setShowEmojiPicker(false);
      setShowAttachments(false);
      setReplyingTo(null);
      setShowHeaderMenu(false);
      setShowConversationMenu(null);
    } catch (err) { console.error(err); }
  };

  const sendMessage = async (text) => {
    const messageText = (text ?? newMessage).trim();
    if (!messageText || !selectedConversation) return;
    setNewMessage("");
    setShowEmojiPicker(false);
    setShowAttachments(false);

    const optimisticMessage = {
      _id: `temp_${Date.now()}`,
      sender: { _id: user._id, name: user.name },
      text: messageText,
      readBy: [user._id],
      createdAt: new Date(),
      pending: true,
      replyTo: replyingTo
    };
    setMessages(prev => [...prev, optimisticMessage]);
    setTypingUser(null);

    const replyData = replyingTo;
    setReplyingTo(null);

    try {
      const res = await api.post(`/messages/${selectedConversation._id}/message`, { 
        text: messageText,
        replyTo: replyData
      });
      setMessages(res.data.messages || []);

      const otherParticipant = selectedConversation.participants?.find(p => p._id !== user._id);
      if (otherParticipant) {
        emitTyping(selectedConversation._id, otherParticipant._id, false);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => prev.filter(msg => msg._id !== optimisticMessage._id));
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (selectedConversation && e.target.value.trim()) {
      const otherParticipant = selectedConversation.participants?.find(p => p._id !== user._id);
      if (otherParticipant) {
        emitTyping(selectedConversation._id, otherParticipant._id, true);
        if (typingTimeout) clearTimeout(typingTimeout);
        const timeout = setTimeout(() => {
          emitTyping(selectedConversation._id, otherParticipant._id, false);
        }, 2000);
        setTypingTimeout(timeout);
      }
    }
  };

  const handleEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const handleBlock = async (userId) => {
    try {
      await api.put(`/messages/block/${userId}`);
      const blockedList = JSON.parse(localStorage.getItem("omnixra_blocked_users") || "[]");
      if (!blockedList.includes(userId)) {
        blockedList.push(userId);
        localStorage.setItem("omnixra_blocked_users", JSON.stringify(blockedList));
      }
      setIsBlocked(true);
      setShowHeaderMenu(false);
      setShowConversationMenu(null);
      setSelectedConversation(null);
      fetchConversations();
    } catch (err) { console.error(err); }
  };

  const handleUnblock = async (userId) => {
    try {
      await api.put(`/messages/unblock/${userId}`);
      const blockedList = JSON.parse(localStorage.getItem("omnixra_blocked_users") || "[]");
      const idx = blockedList.indexOf(userId);
      if (idx > -1) {
        blockedList.splice(idx, 1);
        localStorage.setItem("omnixra_blocked_users", JSON.stringify(blockedList));
      }
      setIsBlocked(false);
      setShowHeaderMenu(false);
    } catch (err) { console.error(err); }
  };

  const handleDeleteForMe = async (conversationId) => {
    try {
      await api.put(`/messages/${conversationId}/delete-for-me`);
      setShowDeleteConfirm(null);
      setShowConversationMenu(null);
      setSelectedConversation(null);
      fetchConversations();
    } catch (err) { console.error(err); }
  };

  const handleDeleteForEveryone = async (conversationId) => {
    try {
      await api.delete(`/messages/${conversationId}`);
      setShowDeleteConfirm(null);
      setShowConversationMenu(null);
      setSelectedConversation(null);
      fetchConversations();
    } catch (err) { console.error(err); }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewMessage(prev => prev + ` [📎 ${file.name}]`);
      setShowAttachments(false);
    }
  };

  const handleReplyToMessage = (msg) => {
    setReplyingTo({
      messageId: msg._id,
      text: msg.text?.substring(0, 80),
      senderName: msg.sender?.name || "User"
    });
    inputRef.current?.focus();
  };

  const getMessageStatus = (msg) => {
    if (msg.sender?._id !== user?._id) return null;
    if (msg.pending) return <Check size={12} className="text-slate-400" />;
    const readCount = msg.readBy?.length || 1;
    if (readCount >= 2) return <CheckCheck size={12} className="text-blue-400" />;
    return <CheckCheck size={12} className="text-slate-400" />;
  };

  const formatTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const formatLastSeen = (date) => {
    if (!date) return "Offline";
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return "last seen just now";
    if (diff < 3600) return `last seen ${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      const mins = Math.floor((diff % 3600) / 60);
      return `last seen ${hours}h ${mins}m ago`;
    }
    return `last seen ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  };

  const groupMessagesByDate = () => {
    const groups = [];
    let currentDate = null;
    let currentGroup = null;
    messages.forEach(msg => {
      const msgDate = formatDate(msg.createdAt);
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        currentGroup = { date: msgDate, messages: [] };
        groups.push(currentGroup);
      }
      currentGroup.messages.push(msg);
    });
    return groups;
  };

  const otherParticipant = selectedConversation?.participants?.find(p => p._id !== user?._id);
  const isOtherOnline = otherParticipant ? onlineUsers.has(otherParticipant._id) : false;
  const messageGroups = groupMessagesByDate();
  const filteredConversations = conversations.filter(conv => {
    // Only show conversations with at least one message
    if (!conv.messages || conv.messages.length === 0) return false;
    if (!searchQuery.trim()) return true;
    const other = conv.participants?.find(p => p._id !== user?._id);
    return other?.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });


  // Long press handlers for conversation list
  const handleConversationLongPress = (convId) => {
    setShowConversationMenu(convId);
  };

  const handleConversationTouchStart = (convId) => {
    const timer = setTimeout(() => {
      handleConversationLongPress(convId);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleConversationTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  if (!selectedConversation) {
    return (
      <div className="page-scroll">
        <div className="page-container">
          <button onClick={() => setPage("home")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="page-title">Inbox</h1>

          <div className="inbox-search-bar mt-4">
            <Search size={14} className="text-slate-500" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="inbox-search-input" placeholder="Search chats..." />
          </div>

          <div className="space-y-3 mt-4">
            {loadingConversations ? (
              <div className="flex flex-col items-center justify-center mt-20">
                <LoadingDots />
                <p className="text-xs text-slate-600 mt-3">Loading conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="empty-state">{searchQuery.trim() ? "No chats found" : "No conversations yet"}</div>
            ) : (
              filteredConversations.map(conv => {
                const other = conv.participants?.find(p => p._id !== user?._id);
                const isOnline = other ? onlineUsers.has(other._id) : false;
                const lastMsg = conv.messages?.[conv.messages.length - 1];
                const unreadCount = conv.messages?.filter(m => m.sender?._id !== user?._id && !m.readBy?.includes(user?._id)).length || 0;

                return (
                  <div key={conv._id} className="relative">
                    <button onClick={() => openConversation(conv._id)} className="talent-card flex items-center gap-3 w-full text-left">
                      <div className="relative">
                        <div className="avatar avatar-small bg-gradient-to-br from-indigo-500 to-purple-600">
                          {other?.profilePicture ? <img src={other.profilePicture} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : other?.name?.[0]}
                        </div>
                        {isOnline && <div className="online-dot" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-sm flex items-center gap-2 truncate">
                            {other?.name || "User"}
                            {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
                          </div>
                          {lastMsg && <span className="text-[9px] text-slate-600 flex-shrink-0 ml-2">{formatTime(lastMsg.createdAt)}</span>}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-600 truncate mt-0.5">
                          {lastMsg?.sender?._id === user?._id && <span className="flex-shrink-0">{getMessageStatus(lastMsg)}</span>}
                          <span className="truncate">{conv.lastMessage || "No messages"}</span>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setShowConversationMenu(conv._id); }} className="whatsapp-back-btn">
                        <MoreVertical size={16} />
                      </button>
                    </button>

                    {showConversationMenu === conv._id && (
                      <div className="whatsapp-conversation-menu">
                        <button onClick={() => { setShowDeleteConfirm(conv._id); setShowConversationMenu(null); }} className="whatsapp-menu-item whatsapp-menu-danger">
                          <Trash2 size={14} /> Delete Chat
                        </button>
                        <button onClick={() => handleBlock(other?._id)} className="whatsapp-menu-item whatsapp-menu-danger">
                          <Ban size={14} /> Block User
                        </button>
                      </div>
                    )}

                    {showDeleteConfirm === conv._id && (
                      <div className="whatsapp-delete-confirm">
                        <p className="text-xs text-slate-300 mb-3">Delete this chat?</p>
                        <button onClick={() => handleDeleteForMe(conv._id)} className="whatsapp-menu-item">
                          🗑️ Delete for Me
                        </button>
                        <button onClick={() => handleDeleteForEveryone(conv._id)} className="whatsapp-menu-item whatsapp-menu-danger">
                          🗑️ Delete for Everyone
                        </button>
                        <button onClick={() => setShowDeleteConfirm(null)} className="whatsapp-menu-item">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="whatsapp-chat">
      <div className="whatsapp-header">
        <button onClick={() => setSelectedConversation(null)} className="whatsapp-back-btn">
          <ArrowLeft size={20} />
        </button>
        <div className="relative">
          <div className="avatar avatar-small bg-gradient-to-br from-indigo-500 to-purple-600">
            {otherParticipant?.profilePicture ? <img src={otherParticipant.profilePicture} alt="" loading="eager" decoding="async" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : otherParticipant?.name?.[0]}
          </div>
          {isOtherOnline && <div className="online-dot" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-white truncate">{otherParticipant?.name || "User"}</div>
          <div className="text-[10px] text-slate-400">
            {typingUser ? "typing..." : isOtherOnline ? "Online" : formatLastSeen(lastSeen)}
          </div>
        </div>
        <Lock size={12} className="text-slate-500 flex-shrink-0" />
        <button onClick={() => setShowHeaderMenu(!showHeaderMenu)} className="whatsapp-back-btn relative">
          <MoreVertical size={18} />
          {showHeaderMenu && (
            <div className="whatsapp-header-menu">
              {isBlocked ? (
                <button onClick={() => handleUnblock(otherParticipant?._id)} className="whatsapp-menu-item">
                  <Unlock size={14} /> Unblock User
                </button>
              ) : (
                <button onClick={() => handleBlock(otherParticipant?._id)} className="whatsapp-menu-item whatsapp-menu-danger">
                  <Ban size={14} /> Block User
                </button>
              )}
              <button onClick={() => { setShowDeleteConfirm(selectedConversation._id); setShowHeaderMenu(false); }} className="whatsapp-menu-item whatsapp-menu-danger">
                <Trash2 size={14} /> Delete Chat
              </button>
            </div>
          )}
        </button>
      </div>

      <div className="whatsapp-messages">
        <div className="whatsapp-encryption-banner">
          <Lock size={8} />
          <span>Messages are end-to-end encrypted</span>
        </div>
        {isBlocked && (
          <div className="whatsapp-blocked-banner">
            <Ban size={12} />
            <span>You have blocked this user</span>
          </div>
        )}
        {messageGroups.map((group, groupIdx) => (
          <div key={groupIdx}>
            <div className="whatsapp-date-divider">
              <span>{group.date}</span>
            </div>
            {group.messages.map((msg, i) => {
              const isOwn = msg.sender?._id === user?._id;
              return (
                <div 
                  key={msg._id || i} 
                  className={`whatsapp-message-row ${isOwn ? "whatsapp-message-own" : "whatsapp-message-other"}`}
                  onClick={() => handleReplyToMessage(msg)}
                >
                  <div className={`whatsapp-bubble ${isOwn ? "whatsapp-bubble-own" : "whatsapp-bubble-other"}`}>
                    {msg.replyTo && (
                      <div className="whatsapp-reply-context">
                        <div className="whatsapp-reply-name">{msg.replyTo.senderName || "User"}</div>
                        <div className="whatsapp-reply-text">{msg.replyTo.text}</div>
                      </div>
                    )}
                    <span className="whatsapp-bubble-text">{msg.text}</span>
                    <span className="whatsapp-bubble-meta">
                      <span className="whatsapp-bubble-time">{formatTime(msg.createdAt)}</span>
                      {isOwn && getMessageStatus(msg)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {typingUser && (
          <div className="whatsapp-message-row whatsapp-message-other">
            <div className="whatsapp-bubble whatsapp-bubble-other">
              <div className="whatsapp-typing"><span></span><span></span><span></span></div>
            </div>
          </div>
        )}
        {messages.length === 0 && !typingUser && (
          <div className="whatsapp-empty-chat">
            <div className="whatsapp-empty-icon">💬</div>
            <p className="text-xs text-slate-500 mt-2">No messages yet</p>
            <p className="text-[10px] text-slate-600 mt-1">Say hi to {otherParticipant?.name?.split(" ")[0] || "them"} 👋</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {replyingTo && (
        <div className="whatsapp-reply-bar">
          <div className="flex-1 min-w-0">
            <div className="text-[9px] text-indigo-400 font-semibold">Replying to: {replyingTo.senderName}</div>
            <div className="text-[10px] text-slate-500 truncate">{replyingTo.text}</div>
          </div>
          <button onClick={() => setReplyingTo(null)} className="whatsapp-reply-close"><X size={16} /></button>
        </div>
      )}

      {showEmojiPicker && (
        <div className="whatsapp-emoji-picker">
          {EMOJIS.map(emoji => (
            <button key={emoji} onClick={() => handleEmojiSelect(emoji)} className="whatsapp-emoji-btn">{emoji}</button>
          ))}
        </div>
      )}

      {showAttachments && (
        <div className="whatsapp-attachments">
          <button onClick={() => fileInputRef.current?.click()} className="whatsapp-attachment-btn"><Image size={20} /><span>Photos</span></button>
          <button onClick={() => fileInputRef.current?.click()} className="whatsapp-attachment-btn"><FileText size={20} /><span>Documents</span></button>
          <button onClick={() => fileInputRef.current?.click()} className="whatsapp-attachment-btn"><Camera size={20} /><span>Camera</span></button>
          <button className="whatsapp-attachment-btn"><User size={20} /><span>Contact</span></button>
        </div>
      )}

      <div className="whatsapp-composer">
        <button onClick={() => { setShowAttachments(!showAttachments); setShowEmojiPicker(false); }} className="whatsapp-composer-icon">
          <Plus size={20} />
        </button>
        <input
          ref={inputRef}
          value={newMessage}
          onChange={handleTyping}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          className="whatsapp-input"
          placeholder={isBlocked ? "You blocked this user" : "Type a message..."}
          disabled={isBlocked}
        />
        <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowAttachments(false); }} className="whatsapp-composer-icon">
          <Smile size={20} />
        </button>
        {newMessage.trim() ? (
          <button onClick={() => sendMessage()} className="whatsapp-send-btn">
            <Send size={18} />
          </button>
        ) : (
          <button className="whatsapp-composer-icon">
            <Mic size={20} />
          </button>
        )}
      </div>

      {showDeleteConfirm === selectedConversation?._id && (
        <div className="whatsapp-delete-confirm whatsapp-delete-confirm-center">
          <p className="text-xs text-slate-300 mb-3">Delete this chat?</p>
          <button onClick={() => handleDeleteForMe(selectedConversation._id)} className="whatsapp-menu-item">🗑️ Delete for Me</button>
          <button onClick={() => handleDeleteForEveryone(selectedConversation._id)} className="whatsapp-menu-item whatsapp-menu-danger">🗑️ Delete for Everyone</button>
          <button onClick={() => setShowDeleteConfirm(null)} className="whatsapp-menu-item">Cancel</button>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFileSelect} className="hidden" />
    </div>
  );
}
export default InboxPage;
