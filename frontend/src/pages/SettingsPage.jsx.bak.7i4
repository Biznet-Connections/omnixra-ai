import React, { useState } from "react";
import { Bell, BriefcaseBusiness, Globe2, Mail, Lock, Trash2, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [jobAlerts, setJobAlerts] = useState(true);
  const [profilePublic, setProfilePublic] = useState(true);
  const { logout } = useAuth();

  return (
    <div className="page-scroll">
      <div className="page-container">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and preferences.</p>

        <div className="settings-card mt-7">
          <div className="settings-row">
            <div className="settings-row-icon"><Bell size={16} /></div>
            <div className="flex-1">
              <div className="text-sm font-medium">Notifications</div>
              <div className="text-xs text-slate-700 mt-1">Receive updates about applications.</div>
            </div>
            <button onClick={() => setNotifications(!notifications)} className={`toggle ${notifications ? "toggle-on" : ""}`}><span /></button>
          </div>

          <div className="settings-row">
            <div className="settings-row-icon"><BriefcaseBusiness size={16} /></div>
            <div className="flex-1">
              <div className="text-sm font-medium">Job alerts</div>
              <div className="text-xs text-slate-700 mt-1">Notify me when new opportunities match.</div>
            </div>
            <button onClick={() => setJobAlerts(!jobAlerts)} className={`toggle ${jobAlerts ? "toggle-on" : ""}`}><span /></button>
          </div>

          <div className="settings-row">
            <div className="settings-row-icon"><Globe2 size={16} /></div>
            <div className="flex-1">
              <div className="text-sm font-medium">Public profile</div>
              <div className="text-xs text-slate-700 mt-1">Allow companies to discover you.</div>
            </div>
            <button onClick={() => setProfilePublic(!profilePublic)} className={`toggle ${profilePublic ? "toggle-on" : ""}`}><span /></button>
          </div>
        </div>

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
