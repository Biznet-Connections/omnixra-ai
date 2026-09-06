import React, { useState } from "react";
import { ShieldCheck, MapPin, PenLine, BriefcaseBusiness, Camera } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function ProfilePage() {
  const { user, setUser } = useAuth();
  const [openToWork, setOpenToWork] = useState(true);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const res = await api.put("/auth/profile-picture", {
          profilePicture: reader.result
        });
        setUser({ ...user, profilePicture: res.data.profilePicture });
      } catch (err) {
        console.error("Upload error:", err);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="page-scroll">
      <div className="page-container">
        <div className="profile-cover"><div className="cover-glow" /></div>
        <div className="profile-main-card">
          <div className="profile-header">
            <div className="profile-big-avatar">
              {user?.profilePicture ? (
                <img 
                  src={user.profilePicture} 
                  alt="Profile" 
                  style={{ width: "100%", height: "100%", borderRadius: "18px", objectFit: "cover" }}
                />
              ) : (
                user?.name?.[0] || "U"
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold">{user?.name || "User"}</h1>
                <span className="verified-badge"><ShieldCheck size={12} />Verified</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">{user?.headline || "Professional"}</p>
              <div className="flex flex-wrap gap-4 mt-3 text-[10px] text-slate-700">
                <span className="flex items-center gap-1"><MapPin size={11} />{user?.location || "Location"}</span>
                {user?.isPremium && <span className="text-amber-400">⭐ Premium Member</span>}
              </div>
            </div>
            <label className="outline-button cursor-pointer">
              <Camera size={14} />
              <span className="hidden sm:inline">Upload Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>

          {user?.accountType === "jobseeker" && (
            <div className="profile-open-row">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <BriefcaseBusiness size={16} />
                </div>
                <div>
                  <div className="text-xs font-semibold">Open to Work</div>
                  <div className="text-[10px] text-slate-700">Let recruiters know you're available.</div>
                </div>
              </div>
              <button onClick={() => setOpenToWork(!openToWork)} className={`toggle ${openToWork ? "toggle-on" : ""}`}>
                <span />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
