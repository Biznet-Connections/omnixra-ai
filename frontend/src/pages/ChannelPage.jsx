import React, { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Radio, Users, Share2, Plus, Check, MoreVertical, Trash2 } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import LoadingDots from "../components/LoadingDots";
import ReactionBar from "../components/ReactionBar";
import PostComposer from "../components/PostComposer";
import { timeAgo } from "../utils/helpers";

function ChannelPage({ slug, setPage }) {
  const { user } = useAuth();
  const [channel, setChannel] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState("");
  const sentinelRef = useRef(null);
  const loadingRef = useRef(false);

  const loadChannel = useCallback(async () => {
    try {
      setLoading(true);
      const [chRes, postsRes] = await Promise.all([
        api.get("/channels/" + slug),
        api.get("/channels/" + slug + "/posts?limit=15"),
      ]);
      setChannel(chRes.data);
      setPosts(postsRes.data.posts || []);
      setHasMore(!!postsRes.data.hasMore);
      setCursor(postsRes.data.nextCursor || null);
    } catch (err) {
      console.error("[CHANNEL] load error:", err);
      setError(err.response?.data?.message || "Channel not found");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { loadChannel(); }, [loadChannel]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore || !cursor) return;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const res = await api.get("/channels/" + slug + "/posts?limit=15&cursor=" + encodeURIComponent(cursor));
      setPosts((prev) => [...prev, ...(res.data.posts || [])]);
      setHasMore(!!res.data.hasMore);
      setCursor(res.data.nextCursor || null);
    } catch (err) {
      console.error("[CHANNEL] load more error:", err);
    } finally {
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [slug, cursor, hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "400px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const toggleFollow = async () => {
    if (!channel) return;
    try {
      const endpoint = channel.isFollowing
        ? "/channels/" + channel.slug + "/unfollow"
        : "/channels/" + channel.slug + "/follow";
      const res = await api.post(endpoint);
      setChannel((c) => ({ ...c, isFollowing: res.data.following, followerCount: res.data.followerCount }));
    } catch (err) {
      console.error("[CHANNEL] follow error:", err);
    }
  };

  const shareChannel = async () => {
    if (!channel) return;
    const url = window.location.origin + "/c/" + channel.slug;
    const text = "Follow " + channel.name + " on Omnixra";
    try {
      if (navigator.share) {
        await navigator.share({ title: channel.name, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Link copied: " + url);
      }
    } catch (e) { /* cancelled */ }
  };

  const deleteChannel = async () => {
    if (!confirm("Delete this channel? This cannot be undone.")) return;
    try {
      await api.delete("/channels/" + channel.slug);
      setPage("discover");
    } catch (err) {
      alert(err.response?.data?.message || "Could not delete");
    }
  };

  if (loading) {
    return <div className="page-scroll"><div className="page-container flex justify-center mt-10"><LoadingDots /></div></div>;
  }

  if (error || !channel) {
    return (
      <div className="page-scroll"><div className="page-container">
        <button onClick={() => setPage("discover")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="empty-state mt-7">
          <div className="empty-icon"><Radio size={24} /></div>
          <h2 className="text-sm font-semibold mt-4">{error || "Channel not found"}</h2>
        </div>
      </div></div>
    );
  }

  const adminEmptyText = channel.isAdmin
    ? "You are the admin. Post the first update!"
    : "The channel admin has not posted yet.";

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button onClick={() => setPage("discover")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="channel-header">
          <div className="channel-header-avatar bg-gradient-to-br from-indigo-500 to-purple-600">
            {channel.avatar ? (
              <img src={channel.avatar} alt={channel.name} />
            ) : (
              <Radio size={32} />
            )}
          </div>
          <div className="channel-header-body">
            <div className="channel-header-name">
              {channel.name}
              {channel.verified && <span className="channel-verified">✓</span>}
            </div>
            <div className="channel-header-meta">
              {channel.category} · {channel.followerCount.toLocaleString()} follower{channel.followerCount === 1 ? "" : "s"}
            </div>
            {channel.description && (
              <div className="channel-header-description">{channel.description}</div>
            )}
          </div>
        </div>

        <div className="channel-actions">
          <button
            onClick={toggleFollow}
            className={"channel-primary-btn " + (channel.isFollowing ? "channel-primary-btn-active" : "")}
          >
            {channel.isFollowing ? <><Check size={14} /> Following</> : <><Plus size={14} /> Follow</>}
          </button>
          <button onClick={shareChannel} className="channel-secondary-btn">
            <Share2 size={14} /> Share
          </button>
          {channel.isAdmin && (
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="channel-secondary-btn">
                <MoreVertical size={14} />
              </button>
              {showMenu && (
                <div className="post-menu-dropdown" style={{ right: 0 }}>
                  <button onClick={deleteChannel} className="post-delete-btn">
                    <Trash2 size={14} /> Delete channel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {channel.isAdmin && (
          <button onClick={() => setShowComposer(true)} className="channel-compose-btn">
            <Plus size={14} /> Post to channel
          </button>
        )}

        <div className="channel-feed">
          {posts.length === 0 ? (
            <div className="empty-state mt-7">
              <div className="empty-icon"><Radio size={24} /></div>
              <h2 className="text-sm font-semibold mt-4">No posts yet</h2>
              <p className="text-xs text-slate-700 mt-2">{adminEmptyText}</p>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post._id} className="channel-post">
                <div className="channel-post-header">
                  <div className="channel-post-author">
                    <div className="channel-post-avatar bg-gradient-to-br from-indigo-500 to-purple-600">
                      {channel.avatar ? (
                        <img src={channel.avatar} alt={channel.name} />
                      ) : (
                        <Radio size={14} />
                      )}
                    </div>
                    <div>
                      <div className="channel-post-name">{channel.name}</div>
                      <div className="channel-post-time">{timeAgo(post.createdAt)}</div>
                    </div>
                  </div>
                </div>

                {post.text && <div className="channel-post-text">{post.text}</div>}

                {post.image && (
                  <img src={post.image} alt="" className="channel-post-image" loading="lazy" decoding="async" />
                )}

                {post.video && (
                  <video src={post.video} poster={post.thumbnailUrl} controls className="channel-post-video" />
                )}

                <div className="channel-post-reactions">
                  <ReactionBar
                    postId={post._id}
                    initialCounts={post.reactionCounts || {}}
                    initialMyReaction={post.myReaction}
                  />
                </div>
              </div>
            ))
          )}

          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-6">
              {loadingMore && <LoadingDots />}
            </div>
          )}
        </div>
      </div>

      {showComposer && (
        <PostComposer
          onClose={() => setShowComposer(false)}
          onPosted={() => { setShowComposer(false); loadChannel(); }}
          channelId={channel._id}
          channelName={channel.name}
        />
      )}
    </div>
  );
}

export default ChannelPage;
