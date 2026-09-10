import React, { useState, useEffect } from "react";
import {
  Users, Briefcase, Building2, Ticket, TrendingUp, TrendingDown,
  Zap, Shield, BarChart3, Megaphone, Settings, LogOut, Rocket,
  Eye, MessageCircle, Activity, Target, Award, AlertTriangle
} from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

function AdminDashboard({ setPage }) {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ users: 0, posts: 0, jobs: 0, vouchers: 0, companies: 0, boosts: 0 });
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/admin/stats").catch(() => ({ data: {} })),
      api.get("/admin/activity").catch(() => ({ data: [] }))
    ]).then(([statsRes, activityRes]) => {
      setStats({
        users: statsRes.data.users || 0,
        posts: statsRes.data.posts || 0,
        jobs: statsRes.data.jobs || 0,
        vouchers: statsRes.data.vouchers || 0,
        companies: statsRes.data.companies || 0,
        boosts: statsRes.data.boosts || 0
      });
      setActivity(activityRes.data || []);
      setLoading(false);
    });
  }, []);

  const statCards = [
    { icon: Users, label: "Users", value: stats.users, color: "#6366f1", change: "+12%" },
    { icon: Activity, label: "Posts", value: stats.posts, color: "#8b5cf6", change: "+8%" },
    { icon: Briefcase, label: "Jobs", value: stats.jobs, color: "#ec4899", change: "+23%" },
    { icon: Building2, label: "Companies", value: stats.companies, color: "#06b6d4", change: "0%" },
    { icon: Ticket, label: "Vouchers", value: stats.vouchers, color: "#10b981", change: "-5%" },
    { icon: Rocket, label: "Boosts", value: stats.boosts, color: "#f59e0b", change: "+34%" }
  ];

  const quickActions = [
    { icon: Megaphone, label: "Post as AI", page: "admin-post-ai", color: "#8b5cf6" },
    { icon: Ticket, label: "Vouchers", page: "admin-vouchers", color: "#10b981" },
    { icon: Users, label: "Users", page: "admin-users", color: "#6366f1" },
    { icon: Shield, label: "Moderate", page: "admin-moderation", color: "#ef4444" },
    { icon: Briefcase, label: "Jobs", page: "admin-jobs", color: "#ec4899" },
    { icon: BarChart3, label: "Analytics", page: "admin-analytics", color: "#06b6d4" },
    { icon: Zap, label: "Announce", page: "admin-announcements", color: "#f59e0b" },
    { icon: Settings, label: "Settings", page: "admin-settings", color: "#64748b" }
  ];

  return (
    <div className="admin-root">
      <div className="admin-grid-bg" />
      <div className="admin-glow admin-glow-1" />
      <div className="admin-glow admin-glow-2" />

      <div className="admin-content">
        {/* Header */}
        <div className="admin-header">
          <div className="admin-header-left">
            <div className="admin-header-orb">
              <Zap size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="admin-header-title">COMMAND CENTER</h1>
              <p className="admin-header-subtitle">
                Welcome back, {user?.name || "Admin"}. System operational.
              </p>
            </div>
          </div>
          <button onClick={logout} className="admin-logout-btn">
            <LogOut size={14} />
            <span>LOGOUT</span>
          </button>
        </div>

        {/* Stat Cards */}
        <div className="admin-stats-grid">
          {statCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="admin-stat-card" style={{ "--accent": stat.color }}>
                <div className="admin-stat-icon" style={{ background: `linear-gradient(135deg, ${stat.color}, ${stat.color}88)` }}>
                  <Icon size={18} />
                </div>
                <div className="admin-stat-body">
                  <div className="admin-stat-label">{stat.label}</div>
                  <div className="admin-stat-value">{loading ? "—" : stat.value.toLocaleString()}</div>
                  <div className={`admin-stat-change ${stat.change.startsWith("+") ? "up" : stat.change === "0%" ? "flat" : "down"}`}>
                    {stat.change.startsWith("+") ? <TrendingUp size={10} /> : stat.change === "0%" ? <Target size={10} /> : <TrendingDown size={10} />}
                    <span>{stat.change}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="admin-section">
          <div className="admin-section-header">
            <Zap size={14} className="admin-section-icon" />
            <h2 className="admin-section-title">QUICK ACTIONS</h2>
          </div>
          <div className="admin-actions-grid">
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <button
                  key={i}
                  onClick={() => setPage(action.page)}
                  className="admin-action-card"
                  style={{ "--accent": action.color }}
                >
                  <div className="admin-action-icon" style={{ background: `${action.color}15`, border: `1px solid ${action.color}40`, color: action.color }}>
                    <Icon size={20} />
                  </div>
                  <span className="admin-action-label">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Activity */}
        <div className="admin-section">
          <div className="admin-section-header">
            <Activity size={14} className="admin-section-icon" />
            <h2 className="admin-section-title">LIVE ACTIVITY</h2>
            <div className="admin-live-pulse">
              <span className="admin-live-dot" />
              <span>LIVE</span>
            </div>
          </div>
          <div className="admin-activity-list">
            {activity.length === 0 ? (
              <div className="admin-empty-activity">
                <Eye size={24} />
                <span>No recent activity</span>
              </div>
            ) : (
              activity.map((item, i) => (
                <div key={i} className="admin-activity-row">
                  <div className="admin-activity-dot" style={{ background: item.color || "#6366f1" }} />
                  <div className="admin-activity-text">
                    <span className="admin-activity-msg">{item.message}</span>
                    <span className="admin-activity-time">{item.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="admin-section">
          <div className="admin-section-header">
            <Shield size={14} className="admin-section-icon" />
            <h2 className="admin-section-title">SYSTEM STATUS</h2>
          </div>
          <div className="admin-status-grid">
            <div className="admin-status-item">
              <div className="admin-status-label">API Health</div>
              <div className="admin-status-value online">● ONLINE</div>
            </div>
            <div className="admin-status-item">
              <div className="admin-status-label">AI Service</div>
              <div className="admin-status-value online">● ACTIVE</div>
            </div>
            <div className="admin-status-item">
              <div className="admin-status-label">Database</div>
              <div className="admin-status-value online">● CONNECTED</div>
            </div>
            <div className="admin-status-item">
              <div className="admin-status-label">Scraper</div>
              <div className="admin-status-value online">● RUNNING</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
