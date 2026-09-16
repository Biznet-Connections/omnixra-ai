import React, { useState } from "react";
import { Radio, Users, ArrowRight } from "lucide-react";
import api from "../api/axios";

function ChannelCard({ channel, onOpen, compact = false }) {
  const [following, setFollowing] = useState(channel.isFollowing || false);
  const [followerCount, setFollowerCount] = useState(channel.followerCount || 0);
  const [loading, setLoading] = useState(false);

  const toggleFollow = async (e) => {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const endpoint = following
        ? "/channels/" + channel.slug + "/unfollow"
        : "/channels/" + channel.slug + "/follow";
      const res = await api.post(endpoint);
      setFollowing(res.data.following);
      setFollowerCount(res.data.followerCount);
    } catch (err) {
      console.error("[CHANNEL] follow error:", err);
    } finally {
      setLoading(false);
    }
  };

  const initial = (channel.name || "C").charAt(0).toUpperCase();

  return (
    <div
      className={"channel-card" + (compact ? " channel-card-compact" : "")}
      onClick={() => onOpen && onOpen(channel)}
      role="button"
    >
      <div className="channel-card-avatar bg-gradient-to-br from-indigo-500 to-purple-600">
        {channel.avatar ? (
          <img src={channel.avatar} alt={channel.name} loading="lazy" decoding="async" />
        ) : (
          <Radio size={compact ? 18 : 22} />
        )}
      </div>

      <div className="channel-card-body">
        <div className="channel-card-title-row">
          <div className="channel-card-name">
            {channel.name}
            {channel.verified && <span className="channel-verified">✓</span>}
          </div>
          <button
            onClick={toggleFollow}
            disabled={loading}
            className={"channel-follow-btn " + (following ? "channel-follow-btn-active" : "")}
          >
            {following ? "Following" : "Follow"}
          </button>
        </div>

        {!compact && channel.category && (
          <div className="channel-card-category">{channel.category}</div>
        )}

        {!compact && channel.description && (
          <div className="channel-card-description">{channel.description}</div>
        )}

        <div className="channel-card-meta">
          <Users size={11} />
          <span>{followerCount.toLocaleString()} follower{followerCount === 1 ? "" : "s"}</span>
          {channel.postCount > 0 && (
            <>
              <span className="channel-card-dot">·</span>
              <span>{channel.postCount} post{channel.postCount === 1 ? "" : "s"}</span>
            </>
          )}
        </div>
      </div>

      {!compact && (
        <div className="channel-card-arrow">
          <ArrowRight size={16} />
        </div>
      )}
    </div>
  );
}

export default ChannelCard;
