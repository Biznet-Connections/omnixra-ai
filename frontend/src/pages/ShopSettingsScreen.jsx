import React, { useState, useRef } from "react";
import { ArrowLeft, Camera, Save, Loader2, MapPin, Phone, Clock, FileText } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { uploadImageToR2 } from "../utils/uploadImage";

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

export default function ShopSettingsScreen({ setPage }) {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    businessName: user?.businessName || "",
    businessCategory: user?.businessCategory || "",
    businessLocation: user?.businessLocation || "",
    businessPhone: user?.businessPhone || "",
    businessWhatsApp: user?.businessWhatsApp || "",
    businessHours: user?.businessHours || "",
    businessAbout: user?.businessAbout || "",
    businessLogo: user?.businessLogo || "",
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }
    setUploadingLogo(true);
    setError("");
    try {
      // Reuse the CV upload util — it handles R2 uploads
      const { imageUrl } = await uploadImageToR2(file);
      update("businessLogo", imageUrl);
    } catch (err) {
      setError("Image upload failed: " + (err.message || "unknown"));
    } finally {
      setUploadingLogo(false);
    }
  };

  const save = async () => {
    if (!form.businessName.trim()) { setError("Business name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const r = await api.put("/profile/business/setup", form);
      setUser({ ...user, ...r.data.user });
      setPage("business-dashboard");
    } catch (e) {
      setError(e.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button
          className="text-slate-500 flex items-center gap-2 mb-5"
          onClick={() => setPage("business-dashboard")}
        >
          <ArrowLeft size={16} /> Back
        </button>

        <h1 className="text-lg font-bold text-white mb-1">Shop Settings</h1>
        <p className="text-xs text-slate-500 mb-6">Manage your shop profile and info.</p>

        {/* Logo / Profile Picture */}
        <div className="shop-logo-section">
          <div
            className="shop-logo-circle"
            style={{
              background: form.businessLogo ? "transparent" : "linear-gradient(135deg, #6366f1, #a855f7)",
            }}
            onClick={() => fileRef.current?.click()}
          >
            {form.businessLogo ? (
              <img src={form.businessLogo} alt="Logo" className="shop-logo-img" />
            ) : (
              <span className="shop-logo-initial">
                {(form.businessName || "S")[0].toUpperCase()}
              </span>
            )}
            <div className="shop-logo-overlay">
              {uploadingLogo ? <Loader2 size={18} className="spin" /> : <Camera size={18} />}
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            style={{ display: "none" }}
          />
          <div className="shop-logo-hint">
            {uploadingLogo ? "Uploading…" : "Tap to change your shop picture"}
          </div>
        </div>

        {/* Form fields */}
        <div className="shop-settings-form">
          <div className="biz-post-field">
            <label>Business Name *</label>
            <input
              type="text"
              value={form.businessName}
              onChange={e => update("businessName", e.target.value)}
              placeholder="e.g. Tafara's Hardware"
              className="biz-post-input"
            />
          </div>

          <div className="biz-post-field">
            <label>Category</label>
            <select
              value={form.businessCategory}
              onChange={e => update("businessCategory", e.target.value)}
              className="biz-post-input"
            >
              <option value="">Select category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="biz-post-field">
            <label><MapPin size={11} /> Location</label>
            <input
              type="text"
              value={form.businessLocation}
              onChange={e => update("businessLocation", e.target.value)}
              placeholder="e.g. Avondale, Harare"
              className="biz-post-input"
            />
          </div>

          <div className="biz-post-field">
            <label><Phone size={11} /> Phone</label>
            <input
              type="tel"
              value={form.businessPhone}
              onChange={e => update("businessPhone", e.target.value)}
              placeholder="+263 77 123 4567"
              className="biz-post-input"
            />
          </div>

          <div className="biz-post-field">
            <label>WhatsApp</label>
            <input
              type="tel"
              value={form.businessWhatsApp}
              onChange={e => update("businessWhatsApp", e.target.value)}
              placeholder="+263 77 123 4567"
              className="biz-post-input"
            />
          </div>

          <div className="biz-post-field">
            <label><Clock size={11} /> Business Hours</label>
            <input
              type="text"
              value={form.businessHours}
              onChange={e => update("businessHours", e.target.value)}
              placeholder="e.g. Mon-Sat 8am-6pm"
              className="biz-post-input"
            />
          </div>

          <div className="biz-post-field">
            <label><FileText size={11} /> About your shop</label>
            <textarea
              value={form.businessAbout}
              onChange={e => update("businessAbout", e.target.value)}
              placeholder="We sell power tools, paint, hardware supplies..."
              className="biz-post-input"
              rows={3}
            />
          </div>

          {error ? <div className="text-xs text-red-400">{error}</div> : null}

          <button
            className="primary-button w-full justify-center mt-2"
            disabled={saving}
            onClick={save}
          >
            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
