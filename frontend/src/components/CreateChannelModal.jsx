import React, { useState } from "react";
import { X, Radio, Search, Check } from "lucide-react";
import api from "../api/axios";

const CATEGORIES = ["General", "Technology", "Healthcare", "Finance & Accounting", "Education", "Construction", "Driving", "Engineering"];

function CreateChannelModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!name.trim() || name.trim().length < 2) {
      setError("Channel name must be at least 2 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/channels", {
        name: name.trim(),
        description: description.trim(),
        category,
      });
      onCreated && onCreated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create channel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Radio size={18} /> Create channel
          </h2>
          <button onClick={onClose} className="icon-button"><X size={18} /></button>
        </div>

        <div className="text-xs text-slate-500 mb-4">
          Channels are one-way broadcasts. Only you (the admin) can post. Followers see your updates.
        </div>

        <label className="form-label">Channel name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Zimbabwe Tech"
          maxLength={60}
          className="form-input"
        />

        <label className="form-label mt-4">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this channel about?"
          maxLength={500}
          rows={3}
          className="form-textarea"
        />

        <label className="form-label mt-4">Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="form-input">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {error && <div className="mt-4 text-xs text-red-400">{error}</div>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="primary-button w-full mt-5 disabled:opacity-70"
        >
          {loading ? "Creating..." : "Create channel"}
        </button>
      </div>
    </div>
  );
}

export default CreateChannelModal;
