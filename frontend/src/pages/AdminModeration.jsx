import React from "react";
import { ArrowLeft, Shield } from "lucide-react";

function AdminModeration({ setPage }) {
  return (
    <div className="admin-root">
      <div className="admin-grid-bg" />
      <div className="admin-content">
        <button onClick={() => setPage("admin")} className="admin-back-btn">
          <ArrowLeft size={16} /> BACK
        </button>
        <div className="admin-header">
          <div className="admin-header-left">
            <div className="admin-header-orb"><Shield size={20} /></div>
            <div>
              <h1 className="admin-header-title">CONTENT MODERATION</h1>
              <p className="admin-header-subtitle">Coming soon</p>
            </div>
          </div>
        </div>
        <div className="admin-empty-activity">
          <Shield size={32} />
          <span>Content moderation tools are under construction.</span>
        </div>
      </div>
    </div>
  );
}

export default AdminModeration;
