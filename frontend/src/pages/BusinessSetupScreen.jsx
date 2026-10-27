import React, { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const CATEGORIES = [
  "Hardware & Tools",
  "Food & Beverage",
  "Retail & Fashion",
  "Beauty & Cosmetics",
  "Electronics",
  "Home & Furniture",
  "Agriculture",
  "Auto & Spare Parts",
  "Printing & Stationery",
  "Services & Repairs",
  "Other",
];

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export default function BusinessSetupScreen({ setPage }) {
  const { user, setUser } = useAuth();
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState(user?.location || "");
  const [phone, setPhone] = useState(user?.businessPhone || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleFinish = async () => {
    if (!category || !location.trim()) {
      setError("Please fill in category and location.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const slug = generateSlug(user?.businessName || user?.name || "shop");
      const r = await api.put("/profile/business/setup", {
        businessCategory: category,
        businessLocation: location.trim(),
        businessPhone: phone.trim(),
        businessSlug: slug,
      });
      // Update local user so App.jsx routes forward
      setUser({ ...user, ...r.data.user });
      setPage("business-welcome");
    } catch (e) {
      setError(e.response?.data?.message || "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="business-setup-screen">
      <div className="business-setup-card">
        <div className="business-setup-emoji">🏪</div>
        <h1 className="business-setup-title">Almost done!</h1>
        <p className="business-setup-sub">
          Tell us about <strong>{user?.businessName || user?.name}</strong> so customers can find you.
        </p>

        <div className="business-setup-field">
          <label>What do you sell?</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="business-setup-input">
            <option value="">Select category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="business-setup-field">
          <label>Where are you located?</label>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="e.g. Avondale, Harare"
            className="business-setup-input"
          />
        </div>

        <div className="business-setup-field">
          <label>WhatsApp / Phone number (optional)</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+263 77 123 4567"
            className="business-setup-input"
          />
        </div>

        {error ? <div className="business-setup-error">{error}</div> : null}

        <button
          className="business-setup-btn"
          disabled={saving || !category || !location.trim()}
          onClick={handleFinish}
        >
          {saving ? <Loader2 size={16} className="spin" /> : <ArrowRight size={16} />}
          {saving ? "Saving…" : "Finish Setup"}
        </button>
      </div>
    </div>
  );
}
