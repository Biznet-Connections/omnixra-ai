import React from "react";
import { Home, Sparkles, PlusCircle, Briefcase, Building2, Users, User, Settings, LogOut, Inbox } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function DesktopSidebar({ page, setPage }) {
  const { user, logout } = useAuth();
  const isCompany = user?.accountType === "company";

  const navItems = isCompany
    ? [
        { id: "home", label: "Home", icon: Home },
        { id: "myai", label: "Company AI", icon: Sparkles },
        { id: "post", label: "Post", icon: PlusCircle },
        { id: "professionals", label: "Talent", icon: Users },
        { id: "inbox", label: "Inbox", icon: Inbox },
      ]
    : [
        { id: "home", label: "Home", icon: Home },
        { id: "myai", label: "My AI", icon: Sparkles },
        { id: "post", label: "Post", icon: PlusCircle },
        { id: "jobs", label: "Jobs", icon: Briefcase },
        { id: "companies", label: "Companies", icon: Building2 },
      ];

  return (
    <aside className="desktop-sidebar">
      <div className="desktop-sidebar-logo">omnixra-AI</div>
      <nav className="desktop-sidebar-nav">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = page === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`desktop-nav-item ${active ? "desktop-nav-active" : ""}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="desktop-sidebar-bottom">
        <button onClick={() => setPage("profile")} className="desktop-nav-item">
          <User size={20} />
          <span>My Profile</span>
        </button>
        <button onClick={() => setPage("settings")} className="desktop-nav-item">
          <Settings size={20} />
          <span>Settings</span>
        </button>
        <button onClick={logout} className="desktop-nav-item">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default DesktopSidebar;
