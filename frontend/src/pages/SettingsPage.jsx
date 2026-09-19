import React, { useState, useEffect } from "react";
import { Bell, BriefcaseBusiness, Globe2, Mail, Lock, Trash2, ChevronRight, Newspaper, Building2, Users, CreditCard } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function SettingsPage() {
  const { logout, user, setUser } = useAuth();
  const [prefs, setPrefs] = useState({
    jobAlerts: true,
    news: true,
    social: true,
  });
  const [profilePublic, setProfilePublic] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/notifications/preferences");
        if (!cancelled) {
          setPrefs({
            jobAlerts: res.data.jobAlerts !== false,
            news: res.data.news !== false,
            social: res.data.social !== false,
          });
        }
      } catch (e) {
        console.warn("[SETTINGS] preferences load failed:", e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function updatePref(key, value) {
    const prev = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(true);
    try {
      await api.put("/notifications/preferences", { [key]: value });
      console.log("[SETTINGS] preference saved:", key, value);
    } catch (e) {
      console.warn("[SETTINGS] save failed:", e.message);
      setPrefs(prev);
    } finally {
      setSaving(false);
    }
  }

  function Toggle({ value, onChange, disabled }) {
    return (
      <button
        onClick={() => !disabled && onChange(!value)}
        className={"toggle " + (value ? "toggle-on" : "")}
        disabled={disabled}
        style={disabled ? { opacity: 0.5, cursor: "not-allowed" } : {}}
      >
        <span />
      </button>
    );
  }

  return (
    <div className="page-scroll">
      <div className="page-container">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and preferences.</p>

        <div className="settings-card mt-7">
          <div className="settings-section-title">Notifications</div>

          <div className="settings-row">
            <div className="settings-row-icon"><Bell size={16} /></div>
            <div className="flex-1">
              <div className="text-sm font-medium">Social activity</div>
              <div className="text-xs text-slate-700 mt-1">Likes, comments, follows, and messages.</div>
            </div>
            <Toggle
              value={prefs.social}
              onChange={(v) => updatePref("social", v)}
              disabled={loading || saving}
            />
          </div>

          <div className="settings-row">
            <div className="settings-row-icon"><BriefcaseBusiness size={16} /></div>
            <div className="flex-1">
              <div className="text-sm font-medium">Job alerts</div>
              <div className="text-xs text-slate-700 mt-1">Get notified when jobs match your profile.</div>
            </div>
            <Toggle
              value={prefs.jobAlerts}
              onChange={(v) => updatePref("jobAlerts", v)}
              disabled={loading || saving}
            />
          </div>

          <div className="settings-row">
            <div className="settings-row-icon"><Newspaper size={16} /></div>
            <div className="flex-1">
              <div className="text-sm font-medium">Daily news</div>
              <div className="text-xs text-slate-700 mt-1">One daily digest of career news.</div>
            </div>
            <Toggle
              value={prefs.news}
              onChange={(v) => updatePref("news", v)}
              disabled={loading || saving}
            />
          </div>

          <div className="settings-row">
            <div className="settings-row-icon"><Globe2 size={16} /></div>
            <div className="flex-1">
              <div className="text-sm font-medium">Public profile</div>
              <div className="text-xs text-slate-700 mt-1">Allow companies to discover you.</div>
            </div>
            <button onClick={() => setProfilePublic(!profilePublic)} className={"toggle " + (profilePublic ? "toggle-on" : "")}><span /></button>
          </div>
        </div>

        {user?.accountType === "company" && (
          <div className="settings-card mt-4">
            <div className="settings-section-title">Company</div>
            <button className="settings-link" onClick={() => window.location.hash = "#company-profile"}>
              <Building2 size={16} />Company profile<ChevronRight size={14} />
            </button>
            <button className="settings-link" onClick={() => window.location.hash = "#post-job"}>
              <BriefcaseBusiness size={16} />Post a job<ChevronRight size={14} />
            </button>
            <button className="settings-link" onClick={() => window.location.hash = "#team"}>
              <Users size={16} />Team members<ChevronRight size={14} />
            </button>
            <button className="settings-link" onClick={() => window.location.hash = "#billing"}>
              <CreditCard size={16} />Billing & subscription<ChevronRight size={14} />
            </button>
          </div>
        )}

        <div className="settings-card mt-4">
          <div className="settings-section-title">Account</div>
          <button className="settings-link"><Mail size={16} />Change email<ChevronRight size={14} /></button>
          <button className="settings-link"><Lock size={16} />Change password<ChevronRight size={14} /></button>
          <button onClick={logout} className="settings-link text-red-400"><Trash2 size={16} />Logout<ChevronRight size={14} /></button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
