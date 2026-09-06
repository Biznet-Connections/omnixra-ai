import React, { useEffect, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import TalentCard from "../components/TalentCard";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function ProfessionalsPage({ setPage }) {
  const { user } = useAuth();
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.accountType === "company") {
      api.post("/ai/talent", { query: "" })
        .then(res => {
          setProfessionals(res.data.talent);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleSearchClick = () => {
    setPage("myai");
  };

  return (
    <div className="page-scroll">
      <div className="page-container">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="page-title">Professionals</h1>
            <p className="page-subtitle">Find the right talent for your company.</p>
          </div>
          <button onClick={handleSearchClick} className="primary-button">
            <Search size={16} />
            Search Professionals
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center mt-10">
            <div className="loading-dot" />
          </div>
        ) : professionals.length === 0 ? (
          <div className="empty-state mt-7">
            <div className="empty-icon"><Sparkles size={24} /></div>
            <h2 className="text-sm font-semibold mt-4">No professionals yet</h2>
            <p className="text-xs text-slate-700 mt-2">Ask Omnixra AI to find talent for you.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4 mt-7">
            {professionals.map(prof => (
              <TalentCard key={prof._id} talent={prof} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfessionalsPage;
