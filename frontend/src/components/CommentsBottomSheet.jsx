import React, { useState, useEffect, useRef } from "react";
import { X, Heart, Send } from "lucide-react";
import api from "../api/axios";
import { playSound } from "../utils/helpers";
import { useSocket } from "../context/SocketContext";
import MentionAutocomplete from "./MentionAutocomplete";
import MentionRenderer from "./MentionRenderer";

function CommentsBottomSheet({ post, onClose, onUpdate }) {
  const realId = post._originalId || post._id;
  const { joinPost, leavePost } = useSocket();
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState("");

  // Mention state
  const [mention, setMention] = useState({ open: false, query: "", startIdx: -1 });
  const [pendingMentions, setPendingMentions] = useState([]);  // array of {id, name}
  const commentInputRef = useRef(null);

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
    onUpdate?.({ ...post, totalComments: (post.totalComments || 0) + 1 });

    try {
      // Only send mentions that actually still appear in the final text
      const mentions = pendingMentions
        .filter(m => text.includes(`@${m.name}`))
        .map(m => m.id);
      await api.post(`/posts/${realId}/comment`, { text, mentions });
      const res = await api.get(`/posts/${realId}/comments`);
      setComments(res.data.comments || []);
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
                <div key={c._id || i} className={`comment-thread ${c.pending ? "comment-pending" : ""}`}>
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
                    {c.pending && <span className="comment-pending-label">Sending...</span>}
                  </div>

                  {c.replies?.length > 0 && (
                    <div className="comment-replies">
                      {c.replies.map((r, j) => (
                        <div key={r._id || j} className={r.pending ? "comment-pending" : ""}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="comment-name">{r.user?.name || "User"}</span>
                            {isPostAuthor(r.user?._id) && (
                              <span className="comment-author-badge">Author</span>
                            )}
                          </div>
                          <p className="comment-text">
                            <MentionRenderer text={r.text} mentions={[]} />
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {replyTo === c._id && (
                    <div className="flex gap-2 mt-2">
                      <input
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleReply(c._id)}
                        className="form-input flex-1"
                        placeholder="Reply..."
                      />
                      <button onClick={() => handleReply(c._id)} className="primary-button">Reply</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="comments-sheet-input">
          <div className="flex gap-2">
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
            <MentionAutocomplete
              open={mention.open}
              query={mention.query}
              onSelect={handleMentionSelect}
              onClose={() => setMention(m => ({ ...m, open: false }))}
            />
            <button onClick={handleAddComment} className="send-button">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommentsBottomSheet;
