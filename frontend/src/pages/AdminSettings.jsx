import React from "react";
import { ArrowLeft, Settings } from "lucide-react";

function AdminSettings({ setPage }) {
  return (
    <div className="admin-root">
      <div className="admin-grid-bg" />
      <div className="admin-content">
        <button onClick={() => setPage("admin")} className="admin-back-btn">
          <ArrowLeft size={16} /> BACK
        </button>
        <div className="admin-header">
          <div className="admin-header-left">
            <div className="admin-header-orb"><Settings size={20} /></div>
            <div>
              <h1 className="admin-header-title">SYSTEM SETTINGS</h1>
              <p className="admin-header-subtitle">Coming soon</p>
            </div>
          </div>
        </div>
        <div className="admin-empty-activity">
          <Settings size={32} />
          <span>System settings are under construction.</span>
        </div>
      </div>
    </div>
  );
}

export default AdminSettings;
