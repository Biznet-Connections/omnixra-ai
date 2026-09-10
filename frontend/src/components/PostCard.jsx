import React, { useState, useEffect } from "react";
import { Heart, MessageCircle, Share2, Bookmark, Ellipsis, Check, Trash2, UserPlus, Building2, Lock, Pencil } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import CommentsBottomSheet from "./CommentsBottomSheet";
import ModernVideoPlayer from "./ModernVideoPlayer";
import VerifiedBadge from "./VerifiedBadge";
import AIAvatar from "./AIAvatar";
import { timeAgo, playSound } from "../utils/helpers";
import { sharePost } from "../utils/share";

function logLike(msg) {
  fetch("/api/posts/debug/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "[LIKE] " + msg })
  }).catch(() => {});
}

function PostCard({ post, onUpdate, onDelete, isUploading, uploadProgress, onViewProfile }) {
  const { user } = useAuth();
  const realId = post._originalId || post._id;
  const [liked, setLiked] = useState(() => {
    try {
      const likedPosts = JSON.parse(localStorage.getItem("omnixra_liked_posts") || "[]");
      return likedPosts.includes(post._id);
    } catch { return false; }
  });
  const [likeCount, setLikeCount] = useState(typeof post.likes === 'number' ? post.likes : 0);
  const [saved, setSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isLikePending, setIsLikePending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(post.text || "");
  const [editError, setEditError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [following, setFollowing] = useState(() => {
    const followingList = JSON.parse(localStorage.getItem("omnixra_following") || "[]");
    return followingList.includes(post.author?._id);
  });

  useEffect(() => {
    const savedPosts = JSON.parse(localStorage.getItem("omnixra_saved_posts") || "[]");
    setSaved(savedPosts.includes(post._id));
  }, [post._id]);

  // Keep likeCount in sync when parent post updates
  useEffect(() => {
    if (typeof post.likes === 'number' && post.likes !== likeCount) {
      setLikeCount(post.likes);
    }
  }, [post.likes]);

  const authorName = post.author?.name || post.author?.companyName || "User";
  const authorHeadline = post.author?.headline || post.author?.category || "Professional";
  const authorInitial = authorName?.[0] || "U";
  const authorProfilePic = post.author?.profilePicture;
  const authorPicLocked = post.author?.profilePicLocked;
  const isCompany = post.authorType === "company" || post.author?.accountType === "company";
  const isAI = authorName === "Omnixra AI";
  const isAuthor = post.author?._id === user?._id;
  const isAdmin = user?.accountType === "admin";
  const isLongText = post.text?.length > 150;
  const displayText = expanded || !isLongText ? post.text : post.text?.substring(0, 150) + "...";
  const isPending = post.pending;

  const handleLike = async () => {
    logLike("called. postId=" + post._id + " liked=" + liked + " count=" + likeCount + " pending=" + isLikePending);
    if (isLikePending || isPending) {
      logLike("BLOCKED (pending)");
      return;
    }
    setIsLikePending(true);
    playSound("like");

    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1);

    try {
      const likedPosts = JSON.parse(localStorage.getItem("omnixra_liked_posts") || "[]");
      if (newLiked) {
        if (!likedPosts.includes(post._id)) likedPosts.push(post._id);
      } else {
        const idx = likedPosts.indexOf(post._id);
        if (idx > -1) likedPosts.splice(idx, 1);
      }
      localStorage.setItem("omnixra_liked_posts", JSON.stringify(likedPosts));
    } catch {}

    try {
      const action = newLiked ? "like" : "unlike";
      const res = await api.put(`/posts/${realId}/like`, { action });
      const serverLikes = typeof res.data.likes === 'number' ? res.data.likes : likeCount;
      setLikeCount(serverLikes);
      onUpdate?.({ ...post, likes: serverLikes });
    } catch (err) {
      console.error(err);
      setLiked(!newLiked);
      setLikeCount(prev => newLiked ? prev - 1 : prev + 1);
      try {
        const likedPosts = JSON.parse(localStorage.getItem("omnixra_liked_posts") || "[]");
        if (newLiked) {
          const idx = likedPosts.indexOf(post._id);
          if (idx > -1) likedPosts.splice(idx, 1);
        } else {
          if (!likedPosts.includes(post._id)) likedPosts.push(post._id);
        }
        localStorage.setItem("omnixra_liked_posts", JSON.stringify(likedPosts));
      } catch {}
    } finally {
      setIsLikePending(false);
      console.log("🔥 handleLike finished. New count:", likeCount, "liked:", liked);
    }
  };

  const handleShare = async () => {
    if (isPending) return;
    playSound("comment");
    try {
      await sharePost(post);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/posts/${realId}`);
      onDelete?.(post._id);
    }
    catch (err) { console.error(err); }
  };

  const handleEdit = async () => {
    if (!editText.trim() || isSaving) return;
    setIsSaving(true);
    setEditError("");
    try {
      const res = await api.put(`/posts/${realId}/edit`, { text: editText.trim() });
      onUpdate?.(res.data);
      setIsEditing(false);
      setShowMenu(false);
      setEditError("");
    } catch (err) {
      console.error("Edit error:", err);
      setEditError(err.response?.data?.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(post.text || "");
    setEditError("");
  };

  const handleFollow = async () => {
    if (isPending) return;
    playSound("follow");

    const newFollowing = !following;
    setFollowing(newFollowing);

    const list = JSON.parse(localStorage.getItem("omnixra_following") || "[]");
    if (newFollowing) {
      if (!list.includes(post.author?._id)) list.push(post.author?._id);
    } else {
      const idx = list.indexOf(post.author?._id);
      if (idx > -1) list.splice(idx, 1);
    }
    localStorage.setItem("omnixra_following", JSON.stringify(list));

    try {
      await api.put(`/posts/follow-user/${post.author?._id}`);
    } catch (err) {
      console.error(err);
      setFollowing(!newFollowing);
    }
  };

  const handleSave = async () => {
    if (isPending) return;

    const newSaved = !saved;
    setSaved(newSaved);

    const savedPosts = JSON.parse(localStorage.getItem("omnixra_saved_posts") || "[]");
    if (newSaved) {
      if (!savedPosts.includes(post._id)) savedPosts.push(post._id);
    } else {
      const idx = savedPosts.indexOf(post._id);
      if (idx > -1) savedPosts.splice(idx, 1);
    }
    localStorage.setItem("omnixra_saved_posts", JSON.stringify(savedPosts));

    try {
      await api.put(`/profile/save-post/${realId}`);
    } catch (err) {
      console.error(err);
      setSaved(!newSaved);
    }
  };

  return (
    <>
      <article className={`post-card ${isPending ? "post-pending" : ""}`}>
        {isPending && (
          <div className="post-pending-banner">
            <span>Posting...</span>
          </div>
        )}
        {isUploading && (
          <div className="upload-progress-bar">
            <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
            <span className="upload-progress-text">{uploadProgress}%</span>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={() => onViewProfile?.(post.author)} className="flex-shrink-0">
            {isAI ? <AIAvatar size="medium" /> : (
              <div className="avatar avatar-medium bg-gradient-to-br from-indigo-500 to-purple-600">
                {authorPicLocked ? <Lock size={18} /> : authorProfilePic ? <img src={authorProfilePic} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : authorInitial}
              </div>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => onViewProfile?.(post.author)} className="font-semibold text-sm hover:text-indigo-300">{authorName}</button>
                  {isAI && <VerifiedBadge size="sm" label="Verified Omnixra AI" />}
                  {!isAI && <span className="author-category">({authorHeadline})</span>}
                  {isCompany && <span className="company-badge"><Building2 size={10} /> Company</span>}
                </div>
                <div className="text-[10px] text-slate-600 mt-1">
                  {timeAgo(post.createdAt)} · 🌍 {post.edited && <span className="text-slate-500 ml-1">(edited)</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isAuthor && !isCompany && !isAI && !isPending && (
                  <button onClick={handleFollow} className={`follow-btn ${following ? "following" : ""}`}>
                    <UserPlus size={12} /> {following ? "Following" : "Follow"}
                  </button>
                )}
                {(isAuthor || isAdmin) && !isPending && (
                  <button onClick={() => setShowMenu(!showMenu)} className="icon-button-small relative">
                    <Ellipsis size={16} />
                    {showMenu && (
                      <div className="post-menu-dropdown">
                        {isAuthor && (
                          <button onClick={() => { setIsEditing(true); setEditText(post.text || ""); setShowMenu(false); }} className="post-delete-btn">
                            <Pencil size={14} /> Edit
                          </button>
                        )}
                        <button onClick={handleDelete} className="post-delete-btn"><Trash2 size={14} /> Delete</button>
                      </div>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {isEditing ? (
          <div className="mt-4">
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              className="form-textarea w-full"
              rows={4}
              autoFocus
              placeholder="Edit your post..."
            />
            {editError && <div className="text-xs text-red-400 mt-2">{editError}</div>}
            <div className="flex gap-2 mt-2">
              <button onClick={handleEdit} disabled={isSaving} className="primary-button text-xs">
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button onClick={handleCancelEdit} className="outline-button text-xs">Cancel</button>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-7 text-slate-300 mt-4 whitespace-pre-wrap">
            {displayText}
            {isLongText && <button onClick={() => setExpanded(!expanded)} className="text-indigo-400 ml-1 text-xs">{expanded ? "Read less" : "Read more"}</button>}
          </p>
        )}

        {post.image ? <div className="post-image-container mt-4"><img src={post.image} alt="Post" className="post-image" loading="lazy" /></div> : post.hasImage ? <PostImage postId={realId} /> : null}
        {post.video && <ModernVideoPlayer src={post.video} text={post.text} authorName={authorName} />}

        {!isPending && !isEditing && (
          <>
            <div className="post-action-row mt-3">
              <button onClick={handleLike} disabled={isLikePending} className={`post-action-icon ${liked ? "post-action-liked" : ""}`}>
                <Heart size={20} fill={liked ? "currentColor" : "none"} />
              </button>
              <button onClick={() => setShowComments(true)} className="post-action-icon"><MessageCircle size={20} /></button>
              <button onClick={handleShare} className="post-action-icon">{copied ? <Check size={20} /> : <Share2 size={20} />}</button>
              <button onClick={handleSave} className={`post-action-icon ${saved ? "post-action-liked" : ""}`}>
                <Bookmark size={20} fill={saved ? "currentColor" : "none"} />
              </button>
            </div>
            <div className="post-stat-numbers">
              <span>{likeCount}</span>
              <span>{post.totalComments || post.comments?.length || 0}</span>
              <span>{post.shares || 0}</span>
              <span></span>
            </div>
          </>
        )}
      </article>
      {showComments && <CommentsBottomSheet post={post} onClose={() => setShowComments(false)} onUpdate={onUpdate} />}
    </>
  );
}
function PostImage({ postId }) {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.get(`/posts/${postId}/image`)
      .then(res => { if (mounted) setImage(res.data.image); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [postId]);

  if (loading) return <div className="post-image-container mt-4"><div className="post-image-placeholder">Loading image...</div></div>;
  if (!image) return null;
  return <div className="post-image-container mt-4"><img src={image} alt="Post" className="post-image" loading="lazy" /></div>;
}

export default PostCard;
