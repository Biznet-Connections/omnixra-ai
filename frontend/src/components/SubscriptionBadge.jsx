import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { tierLabel, tierBadgeColor, tierRank } from "../utils/tierHelpers";

function formatRemaining(expiresAt) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  }
  if (mins >= 1) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export default function SubscriptionBadge({ onClick }) {
  const { user } = useAuth();
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!user?.subscriptionExpiresAt) { setRemaining(null); return; }
    const tick = () => {
      const r = formatRemaining(user.subscriptionExpiresAt);
      setRemaining(r);
      if (!r) window.dispatchEvent(new Event("subscription-expired"));
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [user?.subscriptionExpiresAt]);

  const isPaid = tierRank(user) > 0;
  const colors = tierBadgeColor(user);

  return (
    <button
      onClick={onClick}
      className={`text-[10px] px-2 py-1 rounded-md border font-bold flex items-center gap-1 ${colors}`}
    >
      <span>⭐</span>
      <span>{tierLabel(user)}</span>
      {isPaid && remaining && <span className="text-slate-400">{remaining}</span>}
    </button>
  );
}
