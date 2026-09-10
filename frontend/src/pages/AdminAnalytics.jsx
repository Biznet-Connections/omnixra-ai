import React from "react";
import { ArrowLeft, BarChart3 } from "lucide-react";

function AdminAnalytics({ setPage }) {
  return (
    <div className="admin-root">
      <div className="admin-grid-bg" />
      <div className="admin-content">
        <button onClick={() => setPage("admin")} className="admin-back-btn">
          <ArrowLeft size={16} /> BACK
        </button>
        <div className="admin-header">
          <div className="admin-header-left">
            <div className="admin-header-orb"><BarChart3 size={20} /></div>
            <div>
              <h1 className="admin-header-title">ANALYTICS</h1>
              <p className="admin-header-subtitle">Coming soon</p>
            </div>
          </div>
        </div>
        <div className="admin-empty-activity">
          <BarChart3 size={32} />
          <span>Analytics dashboard is under construction.</span>
        </div>
      </div>
    </div>
  );
}

export default AdminAnalytics;
