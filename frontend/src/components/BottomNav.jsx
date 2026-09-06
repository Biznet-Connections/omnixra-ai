import React from "react";
import { Home, Sparkles, PlusCircle, Briefcase, Building2, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function BottomNav({ page, setPage }) {
  const { user } = useAuth();
  const isCompany = user?.accountType === "company";

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "myai", label: "My AI", icon: Sparkles },
    { id: "post", label: "Post", icon: PlusCircle },
    isCompany
      ? { id: "professionals", label: "Professionals", icon: Users }
      : { id: "jobs", label: "Jobs", icon: Briefcase },
    { id: "companies", label: "Companies", icon: Building2 }
  ];

  const handleClick = (itemId) => {
    console.log("=== BOTTOM NAV CLICKED ===");
    console.log("Item:", itemId);
    setPage(itemId);
  };

  return (
    <nav className="bottom-nav">
      {navItems.map(item => {
        const Icon = item.icon;
        const active = page === item.id;
        return (
          <button
            key={item.id}
            onClick={() => handleClick(item.id)}
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

export default BottomNav;
