import React from "react";
import { X, Edit3, Eye, Building2, Briefcase, BarChart3, Bookmark, Settings, LogOut, FileText, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function ProfileMenu({ onClose, onNavigate }) {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: "edit-profile", label: "Edit Profile", icon: Edit3 },
    { id: "my-posts", label: "Manage My Posts", icon: FileText },
    { id: "profile-views", label: "Profile Views", icon: Eye },
    { id: "companies-viewed", label: "Companies Viewed", icon: Building2 },
    { id: "my-applications", label: "My Applications", icon: Briefcase },
    { id: "profile-stats", label: "Profile Stats", icon: BarChart3 },
    { id: "saved-posts", label: "Saved Posts", icon: Bookmark },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  const handleItemClick = (itemId) => {
    console.log("=== PROFILE MENU ITEM CLICKED ===");
    console.log("Item:", itemId);
    
    if (itemId === "edit-profile") {
      onNavigate("edit-profile");
    } else if (itemId === "my-posts") {
      onNavigate("my-posts");
    } else if (itemId === "settings") {
      onNavigate("settings");
    } else if (itemId === "profile-views") {
      onNavigate("profile-views");
    } else if (itemId === "companies-viewed") {
      onNavigate("companies-viewed");
    } else if (itemId === "my-applications") {
      onNavigate("my-applications");
    } else if (itemId === "profile-stats") {
      onNavigate("profile-stats");
    } else if (itemId === "saved-posts") {
      onNavigate("saved-posts");
    }
    
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="profile-menu-panel" onClick={e => e.stopPropagation()}>
        <button className="profile-menu-close" onClick={onClose}>
          <X size={18} />
        </button>

        <div className="profile-menu-header">
          <div className="avatar avatar-large bg-gradient-to-br from-indigo-500 to-purple-600">
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              user?.name?.[0] || "U"
            )}
          </div>
          <div>
            <div className="font-semibold text-sm">{user?.name || "User"}</div>
            <div className="text-[10px] text-slate-600">{user?.email}</div>
          </div>
        </div>

        <div className="profile-menu-items">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className="profile-menu-item"
              >
                <Icon size={17} />
                <span>{item.label}</span>
                <ChevronRight size={14} className="ml-auto text-slate-600" />
              </button>
            );
          })}
        </div>

        <button onClick={logout} className="profile-menu-logout">
          <LogOut size={17} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

export default ProfileMenu;
