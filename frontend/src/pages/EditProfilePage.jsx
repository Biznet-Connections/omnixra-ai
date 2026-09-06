import React, { useState } from "react";
import { ArrowLeft, Camera } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function EditProfilePage({ setPage }) {
  const { user, setUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || "",
    headline: user?.headline || "",
    location: user?.location || "",
    about: user?.about || "",
    skills: user?.skills?.join(", ") || "",
    companyName: user?.companyName || ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const res = await api.put("/auth/profile-picture", { profilePicture: reader.result });
        setUser({ ...user, profilePicture: res.data.profilePicture });
      } catch (err) {
        console.error("Upload error:", err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await api.put("/profile/update", {
        name: formData.name,
        headline: formData.headline,
        location: formData.location,
        about: formData.about,
        skills: formData.skills.split(",").map(s => s.trim()).filter(s => s),
        companyName: formData.companyName
      });
      setUser(res.data);
      setSuccess(true);
      setTimeout(() => setPage("home"), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button onClick={() => setPage("home")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
          <ArrowLeft size={16} />
          Back
        </button>

        <h1 className="page-title">Edit Profile</h1>

        <div className="flex justify-center mt-6 mb-6">
          <label className="cursor-pointer">
            <div className="profile-big-avatar">
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt="" style={{ width: "100%", height: "100%", borderRadius: "22px", objectFit: "cover" }} />
              ) : (
                <Camera size={30} />
              )}
            </div>
            <div className="text-center text-xs text-indigo-400 mt-2">Change Photo</div>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        </div>

        <div className="space-y-4">
          {user?.accountType === "company" ? (
            <div>
              <label className="form-label">Company Name</label>
              <input name="companyName" value={formData.companyName} onChange={handleChange} className="form-input" />
            </div>
          ) : (
            <div>
              <label className="form-label">Full Name</label>
              <input name="name" value={formData.name} onChange={handleChange} className="form-input" />
            </div>
          )}

          <div>
            <label className="form-label">Headline</label>
            <input name="headline" value={formData.headline} onChange={handleChange} className="form-input" />
          </div>

          <div>
            <label className="form-label">Location</label>
            <input name="location" value={formData.location} onChange={handleChange} className="form-input" />
          </div>

          <div>
            <label className="form-label">About</label>
            <textarea name="about" value={formData.about} onChange={handleChange} className="form-textarea" rows={4} />
          </div>

          {user?.accountType === "jobseeker" && (
            <div>
              <label className="form-label">Skills (comma separated)</label>
              <input name="skills" value={formData.skills} onChange={handleChange} className="form-input" />
            </div>
          )}

          {error && <div className="text-xs text-red-400">{error}</div>}
          {success && <div className="text-xs text-emerald-400">Profile saved successfully!</div>}

          <button onClick={handleSave} disabled={saving} className="primary-button w-full">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditProfilePage;
