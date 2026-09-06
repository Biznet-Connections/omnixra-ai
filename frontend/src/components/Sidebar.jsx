import React from "react";
import { Sparkles, Mail, Bookmark, FileText, User, Settings, Plus, Users, X, LayoutDashboard } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function Sidebar({ page, setPage, mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth();

  const jobSeekerNav = [
    { id: "chat", label: "Omnixra AI", icon: "sparkles" },
    { id: "inbox", label: "Inbox", icon: "inbox" },
    { id: "saved", label: "Saved Chats", icon: "bookmark" },
    { id: "cv", label: "Create CV", icon: "file" }
  ];

  const companyNav = [
    { id: "chat", label: "Omnixra AI", icon: "sparkles" },
    { id: "findtalent", label: "Find Talent", icon: "users" },
    { id: "inbox", label: "Inbox", icon: "inbox" },
    { id: "saved", label: "Saved Chats", icon: "bookmark" }
  ];

  const adminNav = [
    { id: "admin", label: "Admin Dashboard", icon: "dashboard" },
    { id: "chat", label: "Omnixra AI", icon: "sparkles" }
  ];

  const nav = user?.accountType === "admin" ? adminNav : user?.accountType === "company" ? companyNav : jobSeekerNav;

  const iconFor = (name) => {
    const props = { size: 18, strokeWidth: 1.8 };
    const map = {
      sparkles: <Sparkles {...props} />,
      inbox: <Mail {...props} />,
      bookmark: <Bookmark {...props} />,
      file: <FileText {...props} />,
      user: <User {...props} />,
      settings: <Settings {...props} />,
      plus: <Plus {...props} />,
      users: <Users {...props} />,
      dashboard: <LayoutDashboard {...props} />
    };
    return map[name];
  };

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/70 z-[60] lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <button onClick={() => setPage("chat")} className="flex items-center gap-3">
            <div className="logo-orb">
              <Sparkles size={21} strokeWidth={2.2} />
            </div>
            <div className="text-left">
              <div className="text-[19px] font-bold tracking-tight">
                omnixra<span className="text-indigo-400">-AI</span>
              </div>
              <div className="text-[8px] text-slate-600 tracking-[.18em]">
                EMPLOYMENT INTELLIGENCE
              </div>
            </div>
          </button>
          <button className="lg:hidden icon-button" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="px-3 pt-5">
          <button
            onClick={() => { setPage("chat"); setMobileOpen(false); }}
            className="new-search-button"
          >
            <Plus size={17} />
            New AI Search
          </button>
        </div>

        <nav className="px-3 mt-6">
          <div className="nav-heading">WORKSPACE</div>
          <div className="space-y-1">
            {nav.map(item => (
              <button
                key={item.id}
                onClick={() => { setPage(item.id); setMobileOpen(false); }}
                className={`nav-item ${page === item.id ? "nav-item-active" : ""}`}
              >
                {iconFor(item.icon)}
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="nav-heading mt-7">ACCOUNT</div>
          <button
            onClick={() => { setPage("profile"); setMobileOpen(false); }}
            className={`nav-item ${page === "profile" ? "nav-item-active" : ""}`}
          >
            <User size={18} />
            <span>My Profile</span>
          </button>
          <button
            onClick={() => { setPage("settings"); setMobileOpen(false); }}
            className={`nav-item ${page === "settings" ? "nav-item-active" : ""}`}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="user-mini">
            <div className="avatar avatar-small from-indigo-500 to-purple-600">
              {user?.name?.[0] || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">{user?.name || "User"}</div>
              <div className="text-[10px] text-slate-600 truncate">
                {user?.isPremium ? "Premium" : "Free account"}
              </div>
            </div>
            <button onClick={logout} className="text-slate-600 hover:text-red-400">
              <X size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
