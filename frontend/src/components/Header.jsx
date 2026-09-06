import React from "react";
import { Menu, Bell, ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function Header({ setMobileOpen }) {
  const { user } = useAuth();

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="icon-button lg:hidden" onClick={() => setMobileOpen(true)}>
          <Menu size={19} />
        </button>
        <div className="hidden sm:block min-w-0">
          <div className="header-title">
            {user?.accountType === "company" ? user?.name : "Omnixra Network"}
          </div>
          <div className="header-subtitle">
            <span className="online-dot" />
            AI systems operational
          </div>
        </div>
      </div>

      <div className="header-right">
        <button className="icon-button">
          <Bell size={18} />
          <span className="notification-dot" />
        </button>
        <button className="hidden sm:flex items-center gap-2 ml-1 px-2 py-1.5 rounded-xl hover:bg-white/[.04]">
          <div className="avatar avatar-xs from-indigo-500 to-purple-600">
            {user?.name?.[0] || "U"}
          </div>
          <ChevronDown size={13} className="text-slate-600" />
        </button>
      </div>
    </header>
  );
}

export default Header;
