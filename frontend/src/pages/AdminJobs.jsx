import React from "react";
import { ArrowLeft, Briefcase } from "lucide-react";

function AdminJobs({ setPage }) {
  return (
    <div className="admin-root">
      <div className="admin-grid-bg" />
      <div className="admin-content">
        <button onClick={() => setPage("admin")} className="admin-back-btn">
          <ArrowLeft size={16} /> BACK
        </button>
        <div className="admin-header">
          <div className="admin-header-left">
            <div className="admin-header-orb"><Briefcase size={20} /></div>
            <div>
              <h1 className="admin-header-title">JOB CONTROL</h1>
              <p className="admin-header-subtitle">Coming soon</p>
            </div>
          </div>
        </div>
        <div className="admin-empty-activity">
          <Briefcase size={32} />
          <span>Job management tools are under construction.</span>
        </div>
      </div>
    </div>
  );
}

export default AdminJobs;
