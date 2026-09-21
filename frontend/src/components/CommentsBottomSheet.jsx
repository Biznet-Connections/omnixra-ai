import React, { useState, useEffect, useRef } from "react";
import { X, Heart, Send, Trash2, Smile } from "lucide-react";
import api from "../api/axios";
import { playSound } from "../utils/helpers";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import MentionAutocomplete from "./MentionAutocomplete";
import EmojiPicker from "./EmojiPicker";
import MentionRenderer from "./MentionRenderer";

function CommentsBottomSheet({ post, onClose, onUpdate, focusCommentId }) {
  const realId = post._originalId || post._id;
  const { joinPost, leavePost } = useSocket();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState("");

  // Mention state
  const [mention, setMention] = useState({ open: false, query: "", startIdx: -1 });
  const [pendingMentions, setPendingMentions] = useState([]);  // array of {id, name}
  const commentInputRef = useRef(null);

  // Emoji picker state
  const [emojiOpen, setEmojiOpen] = useState(false);
  const replyInputRef = useRef(null);
  const [replyEmojiOpen, setReplyEmojiOpen] = useState(false);

  const insertEmojiIntoComment = (emoji) => {
    const el = commentInputRef.current;
    const text = commentText;
    if (!el) {
      setCommentText(text + emoji);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setCommentText(next);
    setTimeout(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  };

  const insertEmojiIntoReply = (emoji) => {
    const el = replyInputRef.current;
    const text = replyText;
    if (!el) {
      setReplyText(text + emoji);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setReplyText(next);
    setTimeout(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  };

  // Detect @ trigger in textarea
  const handleCommentChange = (e) => {
    const val = e.target.value;
    setCommentText(val);
    const cursor = e.target.selectionStart;
    // Find @ before cursor with no space between @ and cursor
    const before = val.slice(0, cursor);
    const atMatch = before.match(/@([^\s@]{0,30})$/);
    if (atMatch) {
      setMention({ open: true, query: atMatch[1], startIdx: cursor - atMatch[1].length - 1 });
    } else {
      setMention(m => ({ ...m, open: false }));
    }
  };

  const handleMentionSelect = (user) => {
    const before = commentText.slice(0, mention.startIdx);
    const after = commentText.slice(commentInputRef.current?.selectionStart || commentText.length);
    const inserted = `@${user.name} `;
    const next = before + inserted + after;
    setCommentText(next);
    setPendingMentions(prev => {
      const exists = prev.find(m => m.id === user._id);
      return exists ? prev : [...prev, { id: user._id, name: user.name }];
    });
    setMention({ open: false, query: "", startIdx: -1 });
    // Refocus
    setTimeout(() => {
      if (commentInputRef.current) {
        const pos = before.length + inserted.length;
        commentInputRef.current.focus();
        commentInputRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const postAuthorId = (post.author?._id || post.author)?.toString();

  const fetchComments = async () => {
    try {
      const res = await api.get(`/posts/${realId}/comments`);
      setComments(res.data.comments || []);
    } catch (err) {
      console.error("Fetch comments error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [realId]);

  // Scroll + highlight target comment when sheet opens via deep link
  useEffect(() => {
    if (!focusCommentId || loading) return;
    let tries = 0;
    const tryScroll = () => {
      const el = document.querySelector(`[data-comment-id="${focusCommentId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("comment-highlight");
        setTimeout(() => el.classList.remove("comment-highlight"), 4200);
        console.log("🎯 [COMMENT DEEP LINK] Scrolled to comment", focusCommentId);
        return;
      }
      tries++;
      if (tries < 20) setTimeout(tryScroll, 150);
    };
    setTimeout(tryScroll, 250);
  }, [focusCommentId, loading, comments.length]);

  // Join the post room while the comments sheet is open (real-time comments)
  useEffect(() => {
    if (realId) joinPost(realId);
    return () => { if (realId) leavePost(realId); };
  }, [realId]);

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    const text = commentText.trim();
    setCommentText("");
    playSound("comment");

    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      _id: tempId,
      text,
      user: { name: "You", _id: post.currentUserId },
      likes: 0,
      replies: [],
      createdAt: new Date().toISOString(),
      pending: true
    };
    setComments(prev => [...prev, optimistic]);

    // Instant: bump parent count NOW (optimistic)
    const nextCount = (post.totalComments || 0) + 1;
    onUpdate?.({ ...post, totalComments: nextCount });

    try {
      // Only send mentions that actually still appear in the final text
      const mentions = pendingMentions
        .filter(m => text.includes(`@${m.name}`))
        .map(m => m.id);
      const res = await api.post(`/posts/${realId}/comment`, { text, mentions });

      // Use the POST response directly — no refetch
      if (Array.isArray(res.data?.comments)) {
        setComments(res.data.comments);
      }
      // Trust the server's count for the parent
      if (typeof res.data?.totalComments === "number") {
        onUpdate?.({ ...post, totalComments: res.data.totalComments });
      }
      setPendingMentions([]);
    } catch (err) {
      console.error("Comment error:", err);
      setComments(prev => prev.filter(c => c._id !== tempId));
      onUpdate?.({ ...post, totalComments: Math.max(0, (post.totalComments || 1) - 1) });
    }
  };

  const handleReply = async (commentId) => {
    if (!replyText.trim()) return;
    const text = replyText.trim();
    setReplyText("");
    setReplyTo(null);
    playSound("comment");

    const tempId = `temp-reply-${Date.now()}`;
    const optimisticReply = {
      _id: tempId,
      text,
      user: { name: "You" },
      createdAt: new Date().toISOString(),
      pending: true
    };
    setComments(prev => prev.map(c =>
      c._id === commentId
        ? { ...c, replies: [...(c.replies || []), optimisticReply] }
        : c
    ));

    try {
      await api.post(`/posts/${realId}/comment/${commentId}/reply`, { text });
      const res = await api.get(`/posts/${realId}/comments`);
      setComments(res.data.comments || []);
    } catch (err) {
      console.error("Reply error:", err);
      setComments(prev => prev.map(c =>
        c._id === commentId
          ? { ...c, replies: (c.replies || []).filter(r => r._id !== tempId) }
          : c
      ));
    }
  };

  const handleLikeComment = async (commentId) => {
    setComments(prev => prev.map(c =>
      c._id === commentId ? { ...c, likes: (c.likes || 0) + 1 } : c
    ));
    try {
      await api.put(`/posts/${realId}/comment/${commentId}/like`);
      const res = await api.get(`/posts/${realId}/comments`);
      setComments(res.data.comments || []);
    } catch (err) {
      console.error("Like comment error:", err);
      setComments(prev => prev.map(c =>
        c._id === commentId ? { ...c, likes: Math.max(0, (c.likes || 1) - 1) } : c
      ));
    }
  };

  const isPostAuthor = (userId) =>
    userId && postAuthorId && userId.toString() === postAuthorId;

  const currentUserId = user?._id?.toString();

  const canDeleteComment = (c) => {
    if (!currentUserId) return false;
    const owner = (c.user?._id || c.user)?.toString();
    return currentUserId === owner || currentUserId === postAuthorId;
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    const backup = comments;
    // Optimistic remove
    setComments(prev => prev.filter(c => c._id !== commentId));
    onUpdate?.({ ...post, totalComments: Math.max(0, (post.totalComments || 1) - 1) });
    try {
      await api.delete(`/posts/${realId}/comment/${commentId}`);
    } catch (err) {
      console.error("Delete comment error:", err);
      setComments(backup);
      onUpdate?.({ ...post, totalComments: (post.totalComments || 0) + 1 });
    }
  };

  const handleDeleteReply = async (commentId, replyId) => {
    if (!window.confirm("Delete this reply?")) return;
    const backup = comments;
    setComments(prev => prev.map(c =>
      c._id === commentId
        ? { ...c, replies: (c.replies || []).filter(r => r._id !== replyId) }
        : c
    ));
    try {
      await api.delete(`/posts/${realId}/comment/${commentId}/reply/${replyId}`);
    } catch (err) {
      console.error("Delete reply error:", err);
      setComments(backup);
    }
  };

  return (
    <div className="comments-bottom-sheet-backdrop" onClick={onClose}>
      <div className="comments-bottom-sheet" onClick={e => e.stopPropagation()}>
        <div className="comments-sheet-header">
          <div className="comments-sheet-handle" />
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="font-semibold text-sm">Comments ({comments.length})</h3>
            <button onClick={onClose} className="icon-button-small">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="comments-sheet-body">
          {loading ? (
            <p className="text-center text-xs text-slate-600 py-8">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-center text-xs text-slate-600 py-8">No comments yet. Be the first!</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c, i) => (
                <div
                  key={c._id || i}
                  data-comment-id={c._id}
                  className={`comment-thread ${c.pending ? "comment-pending" : ""}`}
                >
                  <div className="comment-header">
                    <div className="avatar avatar-xs bg-gradient-to-br from-indigo-500 to-purple-600">
                      {c.user?.profilePicture ? (
                        <img src={c.user.profilePicture} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                      ) : (c.user?.name?.[0] || "U")}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="comment-name">{c.user?.name || "User"}</span>
                        {isPostAuthor(c.user?._id) && (
                          <span className="comment-author-badge">Author</span>
                        )}
                      </div>
                      <p className="comment-text">
                        <MentionRenderer
                          text={c.text}
                          mentions={c.mentions && Array.isArray(c.mentions) ? c.mentions.map(m => typeof m === "object" ? m : { id: m }) : []}
                          onUserClick={(uid) => window.dispatchEvent(new CustomEvent("open-user", { detail: { userId: uid } }))}
                        />
                      </p>
                    </div>
                  </div>
                  <div className="comment-actions">
                    <button onClick={() => handleLikeComment(c._id)} className="comment-action-btn">
                      <Heart size={12} fill={typeof c.likes === "number" && c.likes > 0 ? "currentColor" : "none"} />
                      {typeof c.likes === "number" ? c.likes : 0}
                    </button>
                    <button onClick={() => setReplyTo(replyTo === c._id ? null : c._id)} className="comment-action-btn">
                      Reply
                    </button>
                    {canDeleteComment(c) && !c.pending && (
                      <button
                        onClick={() => handleDeleteComment(c._id)}
                        className="comment-action-btn comment-delete-btn"
                        title="Delete comment"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                    {c.pending && <span className="comment-pending-label">Sending...</span>}
                  </div>

                  {c.replies?.length > 0 && (
                    <div className="comment-replies">
                      {c.replies.map((r, j) => {
                        const canDelReply = currentUserId && (
                          currentUserId === (r.user?._id || r.user)?.toString() ||
                          currentUserId === postAuthorId ||
                          currentUserId === (c.user?._id || c.user)?.toString()
                        );
                        return (
                        <div key={r._id || j} className={r.pending ? "comment-pending" : ""} data-comment-id={r._id}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="comment-name">{r.user?.name || "User"}</span>
                            {isPostAuthor(r.user?._id) && (
                              <span className="comment-author-badge">Author</span>
                            )}
                            {canDelReply && !r.pending && (
                              <button
                                onClick={() => handleDeleteReply(c._id, r._id)}
                                className="comment-action-btn comment-delete-btn ml-auto"
                                title="Delete reply"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                          <p className="comment-text">
                            <MentionRenderer text={r.text} mentions={[]} />
                          </p>
                        </div>
                        );
                      })}
                    </div>
                  )}

                  {replyTo === c._id && (
                    <div className="flex gap-2 mt-2 items-center">
                      <input
                        ref={replyInputRef}
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleReply(c._id)}
                        className="form-input flex-1"
                        placeholder="Reply..."
                      />
                      <div className="composer-emoji-wrap">
                        <button
                          type="button"
                          onClick={() => setReplyEmojiOpen(v => !v)}
                          className={`emoji-trigger-btn ${replyEmojiOpen ? "active" : ""}`}
                          title="Add emoji"
                        >
                          <Smile size={16} />
                        </button>
                        <EmojiPicker
                          open={replyEmojiOpen}
                          onSelect={(e) => insertEmojiIntoReply(e)}
                          onClose={() => setReplyEmojiOpen(false)}
                          anchor="right"
                        />
                      </div>
                      <button onClick={() => handleReply(c._id)} className="primary-button">Reply</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="comments-sheet-input">
          <div className="flex gap-2 items-center">
            <input
              ref={commentInputRef}
              value={commentText}
              onChange={handleCommentChange}
              onKeyDown={e => {
                if (mention.open && e.key === "Enter") { e.preventDefault(); return; }
                if (e.key === "Escape" && mention.open) { setMention(m => ({ ...m, open: false })); return; }
                if (e.key === "Enter") handleAddComment();
              }}
              className="form-input flex-1"
              placeholder="Add a comment... type @ to mention"
            />
            <div className="composer-emoji-wrap">
              <button
                type="button"
                onClick={() => setEmojiOpen(v => !v)}
                className={`emoji-trigger-btn ${emojiOpen ? "active" : ""}`}
                title="Add emoji"
              >
                <Smile size={18} />
              </button>
              <EmojiPicker
                open={emojiOpen}
                onSelect={(e) => insertEmojiIntoComment(e)}
                onClose={() => setEmojiOpen(false)}
                anchor="right"
              />
            </div>
            <button onClick={handleAddComment} className="send-button">
              <Send size={16} />
            </button>
          </div>
          <MentionAutocomplete
            open={mention.open}
            query={mention.query}
            onSelect={handleMentionSelect}
            onClose={() => setMention(m => ({ ...m, open: false }))}
          />
        </div>
      </div>
    </div>
  );
}

export default CommentsBottomSheet;
