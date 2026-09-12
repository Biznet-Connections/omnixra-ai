import React, { useState } from "react";
import { MapPin, MessageCircle, User, Sparkles, Check, Plus } from "lucide-react";

function TalentCard({ talent, onViewProfile }) {
  const [shortlisted, setShortlisted] = useState(false);

  return (
    <div className="talent-card">
      <div className="flex items-start gap-3">
        <div className="avatar avatar-large bg-gradient-to-br from-indigo-500 to-purple-600">
          {talent.profilePicture ? (
            <img src={talent.profilePicture} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            talent.name?.[0] || "U"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm flex items-center gap-1">
            {talent.name}
            {talent.isPremium && <span className="text-amber-400">⭐</span>}
          </div>
          <div className="text-xs text-slate-600 mt-1">{talent.headline || "Professional"}</div>
          <div className="text-[10px] text-slate-700 mt-2 flex items-center gap-1">
            <MapPin size={10} />
            {talent.location || "Location"}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mt-4">
        {talent.skills?.slice(0, 4).map(skill => (
          <span key={skill} className="tag">{skill}</span>
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={() => onViewProfile?.(talent)} className="outline-button flex-1">
          <User size={13} />
          View Profile
        </button>
        <button className="connect-button">
          <MessageCircle size={13} />
          Message
        </button>
        <button
          onClick={() => setShortlisted(!shortlisted)}
          className={`connect-button ${shortlisted ? "connected" : ""}`}
        >
          {shortlisted ? <Check size={14} /> : <Plus size={14} />}
          {shortlisted ? "Shortlisted" : "Shortlist"}
        </button>
        <button className="outline-button text-indigo-400">
          <Sparkles size={13} />
          Ask AI
        </button>
      </div>
    </div>
  );
}

export default TalentCard;
