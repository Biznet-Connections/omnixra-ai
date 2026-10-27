import React from "react";
import { Home, LayoutDashboard, Sparkles, MessageCircle } from "lucide-react";

export default function BusinessBottomNav({ page, setPage }) {
  const navItems = [
    { id: "home", icon: Home, label: "Home" },
    { id: "business-dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "business-ai", icon: Sparkles, label: "Business AI" },
    { id: "inbox", icon: MessageCircle, label: "Inbox" },
  ];

  return (
    <nav className="bottom-nav business-bottom-nav">
      {navItems.map(item => {
        const Icon = item.icon;
        const active = page === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className={`bottom-nav-item ${active ? "bottom-nav-active" : ""}`}
          >
            <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
