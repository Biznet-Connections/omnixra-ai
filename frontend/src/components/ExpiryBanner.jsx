import React, { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { tierRank } from "../utils/tierHelpers";

export default function ExpiryBanner({ onRenew }) {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    const check = () => {
      if (tierRank(user) === 0) { setShow(false); return; }
      const ms = new Date(user.subscriptionExpiresAt).getTime() - Date.now();
      setSecs(Math.max(0, Math.floor(ms / 1000)));
      // Show banner if under 50% remaining (assuming starter = 3min = 180s threshold ~90s)
      const total = user.subscriptionTier === "pro" ? 600 :
                    user.subscriptionTier === "plus" ? 300 : 180;
      const halfRemaining = total / 2;
      setShow(ms / 1000 < halfRemaining && ms > 0);
    };
    check();
    const iv = setInterval(check, 1000);
    return () => clearInterval(iv);
  }, [user]);

  if (!show) return null;

  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  const label = mins > 0 ? `${mins}m ${s}s` : `${s}s`;

  return (
    <div className="sticky top-0 z-40 bg-amber-500/15 border-b border-amber-500/30 px-3 py-2 flex items-center justify-between text-xs">
      <div className="flex items-center gap-2 text-amber-300">
        <AlertTriangle size={14} />
        <span>Expires in <strong>{label}</strong></span>
      </div>
      <button onClick={onRenew} className="text-[10px] px-2 py-1 rounded bg-amber-500/30 text-amber-100 font-bold">
        Renew
      </button>
    </div>
  );
}
