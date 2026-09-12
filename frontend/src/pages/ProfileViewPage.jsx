import React, { useState } from "react";
import { ArrowLeft, MapPin, ShieldCheck, MessageCircle, Sparkles, Check, Plus } from "lucide-react";
import api from "../api/axios";

function ProfileViewPage({ profile, setPage }) {
  const [shortlisted, setShortlisted] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  if (!profile) {
    return (
      <div className="page-scroll">
        <div className="page-container">
          <button onClick={() => setPage("findtalent")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
            <ArrowLeft size={16} />Back
          </button>
          <div className="empty-state">
            <div className="empty-icon"><User size={24} /></div>
            <h2 className="text-sm font-semibold mt-4">No profile selected</h2>
          </div>
        </div>
      </div>
    );
  }

  const askAI = async () => {
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    try {
      const res = await api.post("/ai/analyze-person", {
        personId: profile._id,
        question: aiQuestion
      });
      setAiAnswer(res.data.text);
    } catch (err) {
      console.error("AI error:", err);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button onClick={() => setPage("findtalent")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
          <ArrowLeft size={16} />Back to Find Talent
        </button>

        <div className="profile-cover"><div className="cover-glow" /></div>
        <div className="profile-main-card">
          <div className="profile-header">
            <div className="profile-big-avatar">
              {profile.profilePicture ? (
                <img src={profile.profilePicture} alt="" loading="eager" decoding="async" style={{ width: "100%", height: "100%", borderRadius: "18px", objectFit: "cover" }} />
              ) : (
                profile.name?.[0] || "U"
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold">{profile.name}</h1>
                <span className="verified-badge"><ShieldCheck size={12} />Verified</span>
                {profile.isPremium && <span className="text-amber-400 text-xs">⭐ Premium</span>}
              </div>
              <p className="text-sm text-slate-500 mt-1">{profile.headline || "Professional"}</p>
              <div className="flex flex-wrap gap-4 mt-3 text-[10px] text-slate-700">
                <span className="flex items-center gap-1"><MapPin size={11} />{profile.location || "Location"}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="outline-button"><MessageCircle size={14} />Message</button>
              <button 
                onClick={() => setShortlisted(!shortlisted)} 
                className={`connect-button ${shortlisted ? "connected" : ""}`}
              >
                {shortlisted ? <Check size={14} /> : <Plus size={14} />}
                {shortlisted ? "Shortlisted" : "Shortlist"}
              </button>
            </div>
          </div>

          <div className="profile-sections">
            <section>
              <h2 className="profile-section-title">Skills</h2>
              <div className="flex flex-wrap gap-2 mt-3">
                {profile.skills?.map(skill => (
                  <span key={skill} className="large-tag">{skill}</span>
                ))}
              </div>
            </section>

            <section>
              <h2 className="profile-section-title">Ask AI about this person</h2>
              <div className="talent-search-card mt-3">
                <div className="ai-feature-icon"><Sparkles size={16} /></div>
                <div className="flex-1">
                  <input
                    value={aiQuestion}
                    onChange={e => setAiQuestion(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && askAI()}
                    placeholder={`Is ${profile.name?.split(" ")[0]} a good fit for my role?`}
                    className="talent-input"
                  />
                </div>
                <button onClick={askAI} disabled={aiLoading} className="primary-button">
                  {aiLoading ? "Thinking..." : "Ask AI"}
                </button>
              </div>
              {aiAnswer && (
                <div className="mt-4 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-xs text-slate-300 leading-6">
                  {aiAnswer}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

// Import User icon
import { User } from "lucide-react";

export default ProfileViewPage;
