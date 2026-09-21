import React, { useEffect, useRef, useState } from "react";

const CATEGORIES = [
  {
    id: "smileys",
    label: "😀",
    emojis: ["😀","😄","😁","😊","😍","🥰","😘","😂","🤣","😅","😉","😎","🤩","😇","🙂","🙃","😌","😋","🤗","🤔","😐","😴","🥳","😢","😭","😤","😡","🥺","😬","🤯","😱","🤝"],
  },
  {
    id: "gestures",
    label: "👍",
    emojis: ["👍","👎","👏","🙌","🤝","🤜","💪","🙏","👋","✌️","🤞","🤙","☝️","✋","🤚","🫡","🫶","👌","🤌","✊"],
  },
  {
    id: "hearts",
    label: "❤️",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","💖","💕","💯","🔥","✨","⭐","🌟","💫","🎉","🎊","🕺","💃"],
  },
  {
    id: "work",
    label: "💼",
    emojis: ["💼","💻","📱","📊","📈","📉","💡","🎯","🚀","⏰","📅","📝","✅","❌","🏆","🎓","💼","🖥️","⌨️","🖱️","📌","📎","🔧","🔨","⚙️","🧰","🧠","💼"],
  },
  {
    id: "life",
    label: "🌍",
    emojis: ["🍀","🌈","☀️","🌙","🍕","☕","🍔","🎵","📸","🎬","🏠","🚗","✈️","🌍","🇿🇼","🌎","🌏","🎈","🎁","🎨","🎮","⚽","🏀","🏈","🚴","🏋️","🧘","🌺","🌸","🌻"],
  },
];

export default function EmojiPicker({ open, onSelect, onClose, anchor = "left" }) {
  const [cat, setCat] = useState(CATEGORIES[0].id);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose && onClose();
      }
    };
    const onEsc = (e) => { if (e.key === "Escape") onClose && onClose(); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);

  if (!open) return null;

  const active = CATEGORIES.find(c => c.id === cat) || CATEGORIES[0];

  return (
    <div
      ref={ref}
      className={`emoji-picker ${anchor === "right" ? "emoji-picker-right" : ""}`}
      role="dialog"
      aria-label="Emoji picker"
    >
      <div className="emoji-cat-tabs">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            type="button"
            className={`emoji-cat-tab ${cat === c.id ? "active" : ""}`}
            onClick={() => setCat(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="emoji-grid">
        {active.emojis.map((e, i) => (
          <button
            key={`${e}-${i}`}
            type="button"
            className="emoji-btn"
            onClick={() => onSelect && onSelect(e)}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
