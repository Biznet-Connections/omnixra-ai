import React, { useState } from "react";
import { Sparkles, Search, MapPin, MessageCircle, User, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function FindTalentPage({ setPage, setSelectedProfile }) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [talent, setTalent] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const searchTalent = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await api.post("/ai/talent", { query });
      setTalent(res.data.talent);
      setSearched(true);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const viewProfile = (person) => {
    setSelectedProfile(person);
    setPage("profileview");
  };

  return (
    <div className="page-scroll">
      <div className="page-container">
        <h1 className="page-title">Find Talent</h1>
        <p className="page-subtitle">Discover professionals matched to your hiring needs.</p>

        <div className="talent-search-card mt-7">
          <div className="ai-feature-icon"><Sparkles size={17} /></div>
          <div className="flex-1">
            <div className="text-sm font-semibold">What kind of person are you looking for?</div>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && searchTalent()}
              placeholder="e.g. Network engineer with CCNA"
              className="talent-input"
            />
          </div>
          <button onClick={searchTalent} disabled={loading} className="primary-button">
            {loading ? "Searching..." : "Find"}
            {!loading && <Search size={14} />}
          </button>
        </div>

        {searched && (
          <div className="mt-7 space-y-3">
            <div className="text-xs text-slate-600">{talent.length} potential matches</div>
            {talent.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon"><User size={24} /></div>
                <h2 className="text-sm font-semibold mt-4">No matches found</h2>
                <p className="text-xs text-slate-700 mt-2">Try different skills or keywords.</p>
              </div>
            )}
            {talent.map(person => (
              <div key={person._id} className="talent-card">
                <div className="flex items-start gap-3">
                  <div className="avatar avatar-large bg-gradient-to-br from-indigo-500 to-purple-600">
                    {person.profilePicture ? (
                      <img src={person.profilePicture} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      person.name?.[0] || "U"
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{person.name}</div>
                    <div className="text-xs text-slate-600 mt-1">{person.headline || "Professional"}</div>
                    <div className="text-[10px] text-slate-700 mt-2">
                      <MapPin size={10} className="inline mr-1" />{person.location || "Location"}
                    </div>
                  </div>
                  <div className="talent-match">{person.isPremium ? "⭐ Premium" : "Available"}</div>
                </div>
                <div className="flex flex-wrap gap-1 mt-4">
                  {person.skills?.slice(0, 3).map(skill => (
                    <span key={skill} className="tag">{skill}</span>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => viewProfile(person)} className="outline-button flex-1">
                    <User size={13} />View Profile
                  </button>
                  <button className="connect-button">
                    <MessageCircle size={13} />Message
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FindTalentPage;
