import React, { useState } from "react";
import { Building2, MapPin, Search, Sparkles } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

function CompanySetupScreen({ setPage }) {
  const { user, setUser } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [location, setLocation] = useState("");
  const [industry, setIndustry] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFinish = async () => {
    if (!companyName.trim()) {
      setError("Please enter your company name.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.put("/auth/complete-company-profile", {
        companyName: companyName.trim(),
        location: location.trim() || undefined,
        category: industry.trim() || "General",
      });
      const updated = { ...user, ...res.data };
      localStorage.setItem("omnixra_user", JSON.stringify(updated));
      setUser(updated);
      setPage?.("home");
    } catch (err) {
      setError(err.response?.data?.message || "Could not save. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen auth-background flex items-center justify-center p-4">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />

      <div className="w-full max-w-md relative z-10">
        <div className="auth-card">
          <div className="text-center mb-6">
            <div className="logo-orb mx-auto mb-4">
              <Building2 size={26} strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-bold">Almost done!</h1>
            <p className="text-xs text-slate-500 mt-2">
              Just need a couple of details to set up your company profile.
            </p>
          </div>

          <div className="mt-2">
            <label className="form-label">Company name</label>
            <div className="form-field">
              <Building2 size={16} className="input-icon" />
              <input
                type="text"
                name="company_name"
                autoComplete="organization"
                autoCapitalize="words"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="form-input has-icon"
                placeholder="e.g. Delta Beverages"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="form-label">Location</label>
            <div className="form-field">
              <MapPin size={16} className="input-icon" />
              <input
                type="text"
                name="company_location"
                autoComplete="address-level2"
                autoCapitalize="words"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="form-input has-icon"
                placeholder="e.g. Harare, Zimbabwe"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="form-label">Industry</label>
            <div className="form-field">
              <Search size={16} className="input-icon" />
              <input
                type="text"
                name="company_industry"
                autoComplete="off"
                autoCapitalize="words"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="form-input has-icon"
                placeholder="e.g. Manufacturing"
              />
            </div>
          </div>

          {error && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">{error}</div>}

          <button onClick={handleFinish} disabled={loading} className="primary-button w-full mt-6 disabled:opacity-50">
            {loading ? "Saving..." : "Finish setup"}
            {!loading && <Sparkles size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CompanySetupScreen;
