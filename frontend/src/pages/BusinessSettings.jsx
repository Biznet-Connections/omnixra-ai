import React, { useState } from "react";
import { ArrowLeft, Bell, Mail, Lock, LogOut, Shield, Store } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

export default function BusinessSettings({ setPage }) {
  const { user, logout } = useAuth();
  const [notifyInquiries, setNotifyInquiries] = useState(true);
  const [notifyOrders, setNotifyOrders] = useState(true);

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button
          className="text-slate-500 flex items-center gap-2 mb-5"
          onClick={() => setPage("business-dashboard")}
        >
          <ArrowLeft size={16} /> Back
        </button>

        <h1 className="text-lg font-bold text-white mb-1">Settings</h1>
        <p className="text-xs text-slate-500 mb-6">Manage your business preferences.</p>

        {/* Notifications */}
        <div className="settings-group">
          <h2 className="settings-group-title">Notifications</h2>

          <div className="settings-row">
            <div className="settings-row-left">
              <div className="settings-row-icon"><Bell size={16} /></div>
              <div>
                <div className="settings-row-label">Customer inquiries</div>
                <div className="settings-row-sub">Get notified when someone asks about a product</div>
              </div>
            </div>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={notifyInquiries}
                onChange={e => setNotifyInquiries(e.target.checked)}
              />
              <span className="settings-toggle-slider"></span>
            </label>
          </div>

          <div className="settings-row">
            <div className="settings-row-left">
              <div className="settings-row-icon"><Store size={16} /></div>
              <div>
                <div className="settings-row-label">New orders</div>
                <div className="settings-row-sub">When a customer places an order</div>
              </div>
            </div>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={notifyOrders}
                onChange={e => setNotifyOrders(e.target.checked)}
              />
              <span className="settings-toggle-slider"></span>
            </label>
          </div>
        </div>

        {/* Account */}
        <div className="settings-group">
          <h2 className="settings-group-title">Account</h2>

          <button
            className="settings-row settings-row-btn"
            onClick={() => setPage("change-email")}
          >
            <div className="settings-row-left">
              <div className="settings-row-icon"><Mail size={16} /></div>
              <div>
                <div className="settings-row-label">Change email</div>
                <div className="settings-row-sub">{user?.email}</div>
              </div>
            </div>
            <span className="settings-arrow">›</span>
          </button>

          <button
            className="settings-row settings-row-btn"
            onClick={() => setPage("change-password")}
          >
            <div className="settings-row-left">
              <div className="settings-row-icon"><Lock size={16} /></div>
              <div>
                <div className="settings-row-label">Change password</div>
                <div className="settings-row-sub">Update your login credentials</div>
              </div>
            </div>
            <span className="settings-arrow">›</span>
          </button>

          <button
            className="settings-row settings-row-btn"
            onClick={() => {
              if (window.confirm("Log out of your business account?")) {
                logout();
              }
            }}
          >
            <div className="settings-row-left">
              <div className="settings-row-icon" style={{ color: "#f87171" }}><LogOut size={16} /></div>
              <div>
                <div className="settings-row-label" style={{ color: "#f87171" }}>Logout</div>
                <div className="settings-row-sub">Sign out of this device</div>
              </div>
            </div>
            <span className="settings-arrow">›</span>
          </button>
        </div>

        <div className="settings-footer">
          <Shield size={14} /> Your data is protected
        </div>
      </div>
    </div>
  );
}
