import React, { useState, useEffect, useRef } from "react";
import { UserCheck, Newspaper, Briefcase, User, FileText, MessageCircle } from "lucide-react";
import PostCard from "../components/PostCard";
import ProfileMenu from "../components/ProfileMenu";
import LoadingDots from "../components/LoadingDots";
import { usePosts } from "../context/PostsContext";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function HomePage({ setPage, setSelectedUserId }) {
  const { posts, loading, loadingMore, hasMore, fetchPosts, loadMorePosts, removePost, updatePost } = usePosts();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showLoadingDots, setShowLoadingDots] = useState(false);
  const sentinelRef = useRef(null);
  const loadingTimerRef = useRef(null);
  const lastScrollRef = useRef(Date.now());
  const autoLoadTimerRef = useRef(null);
  const autoLoadCountRef = useRef(0);
  const { user } = useAuth();

  // Initial fetch
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Track scroll activity
  useEffect(() => {
    const onScroll = () => { lastScrollRef.current = Date.now(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // TIME-BASED AUTO-LOAD: every 2 seconds, load next page
  useEffect(() => {
    autoLoadTimerRef.current = setInterval(() => {
      // Don't auto-load if feed is empty
      if (posts.length === 0) return;
      // Don't auto-load if we already have everything
      if (!hasMore) return;
      const secondsSinceScroll = (Date.now() - lastScrollRef.current) / 1000;
      if (secondsSinceScroll < 30) {
        autoLoadCountRef.current += 1;
        console.log("📱 [AUTO-LOAD] auto load #" + autoLoadCountRef.current);
        loadMorePosts();
      }
    }, 2000);

    return () => {
      if (autoLoadTimerRef.current) clearInterval(autoLoadTimerRef.current);
    };
  }, [posts.length, hasMore]);

  // Fallback: if user scrolls to bottom, load more manually
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && posts.length > 0 && hasMore) {
          console.log("📱 [SCROLL] User reached bottom, loading 2 pages");
          loadMorePosts();
          setTimeout(() => loadMorePosts(), 500);
        }
      },
      { rootMargin: "200px 0px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, []);

  // Show loading dots ONLY if loading takes longer than 800ms
  useEffect(() => {
    if (loadingMore) {
      loadingTimerRef.current = setTimeout(() => setShowLoadingDots(true), 1500);
    } else {
      setShowLoadingDots(false);
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    }
    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    };
  }, [loadingMore]);

  // Unread count
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

  const quickActions = [
    { icon: User, label: "Profile", action: () => setShowProfileMenu(true) },
    { icon: UserCheck, label: "Following", action: () => setPage("following") },
    { icon: MessageCircle, label: "Inbox", action: () => setPage("inbox"), badge: unreadCount },
    { icon: Newspaper, label: "News", action: () => setPage("news") },
    { icon: Briefcase, label: "Applications", action: () => setPage("applications") },
    { icon: FileText, label: "My Posts", action: () => setPage("my-posts") }
  ];

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
                  {qa.badge > 0 && <span className="quick-action-badge">{qa.badge > 9 ? "9+" : qa.badge}</span>}
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
              {posts.map(post => (
                <PostCard
                  key={post._id}
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
              ))}
              {hasMore && (
                <div ref={sentinelRef} className="flex flex-col items-center py-6">
                  {showLoadingDots ? (
                    <LoadingDots />
                  ) : (
                    <div style={{ height: 30 }} />
                  )}
                </div>
              )}
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
