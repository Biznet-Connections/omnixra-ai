import React, { useState } from "react";
import api from "../api/axios";

const EMOJIS = ["❤️", "🔥", "👍", "😮"];

function ReactionBar({ postId, initialCounts = {}, initialMyReaction = null, onUpdate }) {
  const [counts, setCounts] = useState(initialCounts || {});
  const [myReaction, setMyReaction] = useState(initialMyReaction);
  const [pending, setPending] = useState(false);

  const react = async (emoji) => {
    if (pending) return;
    setPending(true);

    // Optimistic update
    const prevCounts = { ...counts };
    const prevMy = myReaction;

    const nextCounts = { ...counts };
    // Remove old reaction
    if (prevMy) {
      nextCounts[prevMy] = Math.max(0, (nextCounts[prevMy] || 0) - 1);
    }
    // If same emoji → toggle off. Otherwise add new.
    const isToggleOff = prevMy === emoji;
    if (!isToggleOff) {
      nextCounts[emoji] = (nextCounts[emoji] || 0) + 1;
    }
    setCounts(nextCounts);
    setMyReaction(isToggleOff ? null : emoji);

    try {
      const res = await api.put("/posts/" + postId + "/react", { emoji });
      setCounts(res.data.reactionCounts || {});
      setMyReaction(res.data.myReaction);
      if (onUpdate) onUpdate(res.data);
    } catch (err) {
      console.error("[REACT] error:", err);
      // Rollback
      setCounts(prevCounts);
      setMyReaction(prevMy);
    } finally {
      setPending(false);
    }
  };

  const totalReactions = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="reaction-bar">
      {EMOJIS.map((emoji) => {
        const count = counts[emoji] || 0;
        const active = myReaction === emoji;
        return (
          <button
            key={emoji}
            onClick={() => react(emoji)}
            disabled={pending}
            className={"reaction-pill " + (active ? "reaction-pill-active" : "")}
            aria-label={"React with " + emoji}
          >
            <span className="reaction-pill-emoji">{emoji}</span>
            {count > 0 && <span className="reaction-pill-count">{count}</span>}
          </button>
        );
      })}
      {totalReactions > 0 && (
        <div className="reaction-bar-total">
          {totalReactions} reaction{totalReactions === 1 ? "" : "s"}
        </div>
      )}
    </div>
  );
}

export default ReactionBar;
