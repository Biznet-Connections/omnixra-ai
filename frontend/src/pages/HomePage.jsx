import React, { useState, useEffect, useRef } from "react";
import { UserCheck, Newspaper, Briefcase, User, FileText, MessageCircle } from "lucide-react";
import PostCard from "../components/PostCard";
import ProfileMenu from "../components/ProfileMenu";
import LoadingDots from "../components/LoadingDots";
import { usePosts } from "../context/PostsContext";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function HomePage({ setPage, setSelectedUserId, focusPostId }) {
  const { posts, loading, removePost, updatePost, interleavePosts } = usePosts();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [visiblePosts, setVisiblePosts] = useState([]);
  const sentinelRef = useRef(null);
  const { user } = useAuth();

  // Use posts directly from context (already interleaved)
  useEffect(() => {
    setVisiblePosts(posts);
  }, [posts]);

  // Infinite scroll: when sentinel is visible, append an interleaved copy
  useEffect(() => {
    if (!sentinelRef.current || posts.length === 0) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        const copy = interleavePosts(posts, user?._id).map(p => ({
          ...p,
          _id: `${p._id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
        }));
        setVisiblePosts(prev => [...prev, ...copy]);
      }
    }, { rootMargin: '200px' });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [posts, visiblePosts, user?._id]);

  // Scroll to focused post
  useEffect(() => {
    if (focusPostId && visiblePosts.length > 0) {
      const target = document.getElementById(`post-${focusPostId}`);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusPostId, visiblePosts]);

  // Quick actions
  const quickActions = [
    { icon: User, label: "Profile", action: () => setShowProfileMenu(true) },
    { icon: UserCheck, label: "Following", action: () => setPage("following") },
    { icon: MessageCircle, label: "Inbox", action: () => setPage("inbox"), badge: unreadCount },
    { icon: Newspaper, label: "News", action: () => setPage("news") },
    { icon: Briefcase, label: "Applications", action: () => setPage("applications") },
    { icon: FileText, label: "My Posts", action: () => setPage("my-posts") }
  ];

  useEffect(() => {
    fetchUnreadCount();
    const handleUnreadCount = (event) => setUnreadCount(event.detail?.count || 0);
    const handleNewMessage = () => fetchUnreadCount();
    window.addEventListener("socket-unread-count", handleUnreadCount);
    window.addEventListener("socket-new-message", handleNewMessage);
    return () => {
      window.removeEventListener("socket-unread-count", handleUnreadCount);
      window.removeEventListener("socket-new-message", handleNewMessage);
    };
  }, [user?._id]);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get("/messages/unread/count");
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="page-scroll">
      <div className="page-container">
        <div className="quick-actions-row">
          {quickActions.map((qa, i) => {
            const Icon = qa.icon;
            return (
              <button key={i} onClick={qa.action} className="quick-action-circle">
                <div className="quick-action-ring relative">
                  <Icon size={22} />
                  {qa.badge > 0 && (
                    <span className="quick-action-badge">{qa.badge > 9 ? "9+" : qa.badge}</span>
                  )}
                </div>
                <span>{qa.label}</span>
              </button>
            );
          })}
        </div>

        <div className="feed-section mt-4">
          {loading ? (
            <div className="flex justify-center mt-10"><LoadingDots /></div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><FileText size={24} /></div>
              <h2 className="text-sm font-semibold mt-4">No posts yet</h2>
              <p className="text-xs text-slate-700 mt-2">Be the first to share something!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visiblePosts.map(post => (
                <div key={post._id} id={`post-${post._id}`}>
                  <PostCard
                    post={post}
                    onUpdate={updatePost}
                    onDelete={removePost}
                    onViewProfile={(author) => {
                      if (author && author._id) {
                        setSelectedUserId(author._id);
                        setPage("user-profile");
                      }
                    }}
                  />
                </div>
              ))}
              <div ref={sentinelRef} style={{ height: '1px' }} />
            </div>
          )}
        </div>
      </div>

      {showProfileMenu && (
        <ProfileMenu
          onClose={() => setShowProfileMenu(false)}
          onNavigate={(dest) => { setShowProfileMenu(false); setPage(dest); }}
        />
      )}
    </div>
  );
}
export default HomePage;
