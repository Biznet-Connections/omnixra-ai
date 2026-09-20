import React from "react";

export default function ChatChips({ chips, onPick, tone = "neutral" }) {
  if (!chips || chips.length === 0) return null;

  const styleFor = (t) => {
    if (t === "casual") return "border-purple-400/40 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20";
    if (t === "formal") return "border-slate-500/40 bg-slate-500/10 text-slate-200 hover:bg-slate-500/20";
    return "border-indigo-400/40 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20";
  };

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {chips.map((chip, i) => (
        <button
          key={i}
          onClick={() => onPick(chip)}
          className={"px-3 py-1.5 rounded-full border text-xs font-medium transition-all " + styleFor(tone)}
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
