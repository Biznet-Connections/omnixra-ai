import React, { useState, useEffect, useRef } from "react";
import { UserCheck, Newspaper, Briefcase, User, FileText, MessageCircle , Search } from "lucide-react";
import PostCard from "../components/PostCard";
import ProfileMenu from "../components/ProfileMenu";
import LoadingDots from "../components/LoadingDots";
import SkeletonPostCard from "../components/SkeletonPostCard";
import { usePosts } from "../context/PostsContext";
import { setNativeRefreshHandler } from "../utils/nativeRefresh";
import { usePullToRefresh } from "../utils/usePullToRefresh";
import { useNetworkRefresh } from "../utils/useNetworkRefresh";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function HomePage({ setPage, setSelectedUserId, focusPostId }) {
  const {
    posts,
    loading,
    loadingMore,
    hasMore,
    fetchPosts,
    refreshPosts,
    loadMorePosts,
    removePost,
    updatePost,
    healDiversity,
  } = usePosts();

  // Progressive skeleton: how many placeholder cards to render while loading
  const [visibleSkeletonCount, setVisibleSkeletonCount] = useState(3);

  // Grow the skeleton count while the initial load is in flight (3 -> 9)
  useEffect(() => {
    if (!loading || posts.length > 0) {
      setVisibleSkeletonCount(3);
      return;
    }
    const id = setInterval(() => {
      setVisibleSkeletonCount((n) => (n >= 9 ? 9 : n + 1));
    }, 400);
    return () => clearInterval(id);
  }, [loading, posts.length]);

  // Enable native pull-to-refresh ONLY while Home is mounted
  usePullToRefresh(true);

  // Network status for offline UX
  const { online, lastOnline } = useNetworkStatus();
  const hasCachedPosts = posts.length > 0;

  // Auto-refresh feed when network comes back
  useNetworkRefresh(() => {
    console.log("ðŸŒ [NETWORK] Auto-refreshing feed after reconnect");
    if (typeof refreshPosts === "function") {
      refreshPosts();
    } else if (typeof fetchPosts === "function") {
      fetchPosts(true);
    }
  });

  // Wire native pull-to-refresh -> refreshPosts
  useEffect(() => {
    if (refreshPosts) setNativeRefreshHandler(refreshPosts);
  }, [refreshPosts]);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showLoadingDots, setShowLoadingDots] = useState(false);
  const sentinelRef = useRef(null);
  const loadingTimerRef = useRef(null);
  const { user } = useAuth();

  // Enable native pull-to-refresh ONLY on Home
  usePullToRefresh(true);

  // Self-heal: run diversity on loaded posts once
  useEffect(() => {
    if (healDiversity && posts.length > 2) {
      healDiversity();
    }
  }, [posts.length > 0]);

  // Initial fetch (once)
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Infinite scroll: single-fire on sentinel visibility
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    let inFlight = false;

    const observer = new IntersectionObserver(
      async (entries) => {
        if (
          entries[0].isIntersecting &&
          posts.length > 0 &&
          hasMore &&
          !inFlight
        ) {
          inFlight = true;
          console.log("SCROLL sentinel visible â€” loading next page");
          try {
            await loadMorePosts();
          } finally {
            setTimeout(() => {
              inFlight = false;
            }, 400);
          }
        }
      },
      { rootMargin: "400px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [posts.length, hasMore, loadMorePosts]);

  // Show loading dots only if loading takes longer than 1.5s
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

  // Unread count for Inbox badge
  useEffect(() => {
    fetchUnreadCount();
    const handleUnreadCount = (event) =>
      setUnreadCount(event.detail?.count || 0);
    const handleNewMessage = () => fetchUnreadCount();
    window.addEventListener("socket-unread-count", handleUnreadCount);
    window.addEventListener("socket-new-message", handleNewMessage);
    return () => {
      window.removeEventListener("socket-unread-count", handleUnreadCount);
      window.removeEventListener("socket-new-message", handleNewMessage);
    };
  }, [user?._id]);


  // â”€â”€ Deep-link: scroll to a specific post after it loads â”€â”€
  useEffect(() => {
    if (!focusPostId) return;

    let cancelled = false;
    let tries = 0;
    const MAX_TRIES = 15; // ~3 seconds max

    const tryScroll = () => {
      if (cancelled) return;
      const el = document.querySelector(`[data-post-id="${focusPostId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("post-highlight");
        setTimeout(() => el.classList.remove("post-highlight"), 2600);
        console.log("ðŸ“Œ [DEEP LINK] Scrolled to post", focusPostId);
        return;
      }
      tries++;
      if (tries < MAX_TRIES) {
        setTimeout(tryScroll, 200);
      } else {
        console.warn("ðŸ“Œ [DEEP LINK] Post not found after", MAX_TRIES, "tries");
      }
    };

    // Wait a tick for the feed to render
    const t = setTimeout(tryScroll, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [focusPostId, posts.length]);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get("/messages/unread/count");
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const quickActions = user?.accountType === "company"
    ? [
        { icon: User, label: "Profile", action: () => setShowProfileMenu(true) },
        { icon: Briefcase, label: "Post Job", action: () => setPage("post-job") },
        { icon: FileText, label: "Applications", action: () => setPage("applications") },
        { icon: MessageCircle, label: "Inbox", action: () => setPage("inbox"), badge: unreadCount },
      ]
    : [
        { icon: User, label: "Profile", action: () => setShowProfileMenu(true) },
        { icon: Search, label: "Discover", action: () => setPage("discover") },
        { icon: UserCheck, label: "Following", action: () => setPage("following") },
        { icon: MessageCircle, label: "Inbox", action: () => setPage("inbox"), badge: unreadCount },
        { icon: Newspaper, label: "News", action: () => setPage("news") },
        { icon: Briefcase, label: "Applications", action: () => setPage("applications") },
        { icon: FileText, label: "My Posts", action: () => setPage("my-posts") },
  ];

  return (
    <div className="page-scroll">
      <div className="page-container">
        {!online && hasCachedPosts && (
          <EmptyState variant="offline-cached" />
        )}
        <div className="quick-actions-row">
          {quickActions.map((qa, i) => {
            const Icon = qa.icon;
            return (
              <button key={i} onClick={qa.action} className="quick-action-circle">
                <div className="quick-action-ring relative">
                  <Icon size={22} />
                  {qa.badge > 0 && (
                    <span className="quick-action-badge">
                      {qa.badge > 9 ? "9+" : qa.badge}
                    </span>
                  )}
                </div>
                <span>{qa.label}</span>
              </button>
            );
          })}
        </div>

        <div className="feed-section mt-4">
          {loading && posts.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: visibleSkeletonCount }, (_, i) => i).map((i) => (
                <SkeletonPostCard key={i} />
              ))}
            </div>
          ) : posts.length === 0 ? (
            !online ? (
              <EmptyState variant="offline" type="post" onRetry={() => { if (fetchPosts) fetchPosts(true); }} />
            ) : (
              <EmptyState
                variant="empty"
                type="post"
                title="No posts yet"
                subtitle="Be the first to share something!"
                action={
                  <button onClick={() => setShowPostComposer && setShowPostComposer(true)} className="primary-button mt-4">
                    Create post
                  </button>
                }
              />
            )
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
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
                <div
                  ref={sentinelRef}
                  className="flex flex-col items-center py-6"
                  style={{ minHeight: 60 }}
                >
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
          onNavigate={(dest) => {
            setShowProfileMenu(false);
            setPage(dest);
          }}
        />
      )}
    </div>
  );
}

export default HomePage;
