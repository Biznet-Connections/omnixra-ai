import React, { useState, useEffect } from "react";
import { ArrowLeft, Search, Shield, ShieldOff, Star, Trash2, Mail, Check } from "lucide-react";
import api from "../api/axios";

function AdminUsers({ setPage }) {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    api.get("/admin/users").then(res => {
      setUsers(res.data);
      setFiltered(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    let list = users;
    if (filter === "premium") list = list.filter(u => u.isPremium);
    if (filter === "verified") list = list.filter(u => u.verified);
    if (filter === "jobseeker") list = list.filter(u => u.accountType === "jobseeker");
    if (filter === "company") list = list.filter(u => u.accountType === "company");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    }
    setFiltered(list);
  }, [search, filter, users]);

  const toggleVerify = async (user) => {
    try {
      await api.put(`/admin/verify/${user._id}`);
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, verified: !u.verified } : u));
    } catch (err) { console.error(err); }
  };

  const togglePremium = async (user) => {
    try {
      await api.put(`/admin/premium/${user._id}`);
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isPremium: !u.isPremium } : u));
    } catch (err) { console.error(err); }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${user._id}`);
      setUsers(prev => prev.filter(u => u._id !== user._id));
    } catch (err) { console.error(err); }
  };

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
              <h1 className="admin-header-title">USER MANAGEMENT</h1>
              <p className="admin-header-subtitle">{users.length} total users</p>
            </div>
          </div>
        </div>

        <div className="admin-search-row">
          <div className="admin-search-wrap">
            <Search size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="admin-search-input" />
          </div>
        </div>

        <div className="admin-filters">
          {["all", "jobseeker", "company", "premium", "verified"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`admin-filter-btn ${filter === f ? "active" : ""}`}>
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="admin-empty-activity">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty-activity">No users found</div>
        ) : (
          <div className="admin-user-list">
            {filtered.map(user => (
              <div key={user._id} className="admin-user-card">
                <div className="admin-user-avatar">
                  {user.profilePicture ? <img src={user.profilePicture} alt="" /> : user.name?.[0] || "U"}
                </div>
                <div className="admin-user-info">
                  <div className="admin-user-name">
                    {user.name}
                    {user.verified && <Check size={12} className="admin-user-verified" />}
                    {user.isPremium && <Star size={12} className="admin-user-premium" />}
                  </div>
                  <div className="admin-user-email">{user.email}</div>
                  <div className="admin-user-meta">
                    {user.accountType} · {user.category || "General"} · {user.location || "No location"}
                  </div>
                </div>
                <div className="admin-user-actions">
                  <button onClick={() => toggleVerify(user)} className={`admin-icon-btn ${user.verified ? "active" : ""}`} title="Verify">
                    <Shield size={14} />
                  </button>
                  <button onClick={() => togglePremium(user)} className={`admin-icon-btn ${user.isPremium ? "active-gold" : ""}`} title="Premium">
                    <Star size={14} />
                  </button>
                  <button onClick={() => deleteUser(user)} className="admin-icon-btn danger" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminUsers;
