import React, { useState } from "react";
import { Heart, MessageCircle, Share2, Bookmark, Ellipsis, Check, Trash2, UserPlus, Building2, Lock } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import CommentsBottomSheet from "./CommentsBottomSheet";
import ModernVideoPlayer from "./ModernVideoPlayer";
import VerifiedBadge from "./VerifiedBadge";
import AIAvatar from "./AIAvatar";
import { timeAgo, playSound } from "../utils/helpers";
import { sharePost } from "../utils/share";

function PostCard({ post, onUpdate, onDelete, isUploading, uploadProgress, onViewProfile }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.likes?.includes(user?._id) || false);
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0);
  const [saved, setSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [following, setFollowing] = useState(() => {
    const followingList = JSON.parse(localStorage.getItem("omnixra_following") || "[]");
    return followingList.includes(post.author?._id);
  });

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

  const handleLike = async () => {
    playSound("like");
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1);
    try {
      const res = await api.put(`/posts/${post._id}/like`);
      setLikeCount(res.data.likes?.length || likeCount);
      onUpdate?.(res.data);
    } catch (err) { console.error(err); }
  };

  const handleShare = async () => {
    playSound("comment");
    try {
      await sharePost(post);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    try { await api.delete(`/posts/${post._id}`); onDelete?.(post._id); }
    catch (err) { console.error(err); }
  };

  const handleFollow = async () => {
    playSound("follow");
    const newFollowing = !following;
    setFollowing(newFollowing);
    const list = JSON.parse(localStorage.getItem("omnixra_following") || "[]");
    if (newFollowing) list.push(post.author?._id);
    else { const idx = list.indexOf(post.author?._id); if (idx > -1) list.splice(idx, 1); }
    localStorage.setItem("omnixra_following", JSON.stringify(list));
    try { await api.put(`/posts/follow-user/${post.author?._id}`); } catch (err) { console.error(err); }
  };

  const handleSave = async () => {
    try { await api.put(`/profile/save-post/${post._id}`); setSaved(!saved); } catch (err) { console.error(err); }
  };

  return (
    <>
      <article className="post-card">
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
                <div className="text-[10px] text-slate-600 mt-1">{timeAgo(post.createdAt)} · 🌍</div>
              </div>
              <div className="flex items-center gap-2">
                {!isAuthor && !isCompany && !isAI && (
                  <button onClick={handleFollow} className={`follow-btn ${following ? "following" : ""}`}>
                    <UserPlus size={12} /> {following ? "Following" : "Follow"}
                  </button>
                )}
                {(isAuthor || isAdmin) && (
                  <button onClick={() => setShowMenu(!showMenu)} className="icon-button-small relative">
                    <Ellipsis size={16} />
                    {showMenu && (
                      <div className="post-menu-dropdown">
                        <button onClick={handleDelete} className="post-delete-btn"><Trash2 size={14} /> Delete</button>
                      </div>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm leading-7 text-slate-300 mt-4 whitespace-pre-wrap">
          {displayText}
          {isLongText && <button onClick={() => setExpanded(!expanded)} className="text-indigo-400 ml-1 text-xs">{expanded ? "Read less" : "Read more"}</button>}
        </p>

        {post.image && <div className="post-image-container mt-4"><img src={post.image} alt="Post" className="post-image" /></div>}
        {post.video && <ModernVideoPlayer src={post.video} text={post.text} authorName={authorName} />}

        <div className="post-action-row mt-3">
          <button onClick={handleLike} className={`post-action-icon ${liked ? "post-action-liked" : ""}`}><Heart size={20} fill={liked ? "currentColor" : "none"} /></button>
          <button onClick={() => setShowComments(true)} className="post-action-icon"><MessageCircle size={20} /></button>
          <button onClick={handleShare} className="post-action-icon">{copied ? <Check size={20} /> : <Share2 size={20} />}</button>
          <button onClick={handleSave} className={`post-action-icon ${saved ? "post-action-liked" : ""}`}><Bookmark size={20} fill={saved ? "currentColor" : "none"} /></button>
        </div>
        <div className="post-stat-numbers">
          <span>{likeCount}</span>
          <span>{post.comments?.length || 0}</span>
          <span></span>
          <span></span>
        </div>
      </article>
      {showComments && <CommentsBottomSheet post={post} onClose={() => setShowComments(false)} onUpdate={onUpdate} />}
    </>
  );
}
export default PostCard;
