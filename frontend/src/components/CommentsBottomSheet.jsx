import React, { useState, useEffect } from "react";
import { X, Heart, Send } from "lucide-react";
import api from "../api/axios";

function CommentsBottomSheet({ post, onClose, onUpdate }) {
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState("");

  // Fetch comments when sheet opens
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await api.get(`/posts/${post._id}/comments`);
        setComments(res.data.comments || []);
      } catch (err) {
        console.error("Fetch comments error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchComments();
  }, [post._id]);

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      const res = await api.post(`/posts/${post._id}/comment`, { text: commentText });
      setComments(res.data.comments || []);
      setCommentText("");
      onUpdate?.(res.data);
    } catch (err) {
      console.error("Comment error:", err);
    }
  };

  const handleReply = async (commentId) => {
    if (!replyText.trim()) return;
    try {
      const res = await api.post(`/posts/${post._id}/comment/${commentId}/reply`, { text: replyText });
      setComments(res.data.comments || []);
      setReplyText("");
      setReplyTo(null);
      onUpdate?.(res.data);
    } catch (err) {
      console.error("Reply error:", err);
    }
  };

  const handleLikeComment = async (commentId) => {
    try {
      const res = await api.put(`/posts/${post._id}/comment/${commentId}/like`);
      setComments(res.data.comments || []);
      onUpdate?.(res.data);
    } catch (err) {
      console.error("Like comment error:", err);
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
                <div key={c._id || i} className="comment-thread">
                  <div className="comment-header">
                    <div className="avatar avatar-xs bg-gradient-to-br from-indigo-500 to-purple-600">
                      {c.user?.profilePicture ? (
                        <img src={c.user.profilePicture} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                      ) : (c.user?.name?.[0] || "U")}
                    </div>
                    <div>
                      <span className="comment-name">{c.user?.name || "User"}</span>
                      <p className="comment-text">{c.text}</p>
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
                  </div>

                  {c.replies?.length > 0 && (
                    <div className="comment-replies">
                      {c.replies.map((r, j) => (
                        <div key={j}>
                          <span className="comment-name">{r.user?.name || "User"}</span>
                          <p className="comment-text">{r.text}</p>
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
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddComment()}
              className="form-input flex-1"
              placeholder="Add a comment..."
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
