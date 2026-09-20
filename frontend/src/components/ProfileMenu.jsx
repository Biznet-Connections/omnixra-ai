import React from "react";
import { X, Edit3, Eye, Building2, Briefcase, BarChart3, Bookmark, Settings, LogOut, FileText, ChevronRight, Users, Plus, CreditCard, Inbox } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function ProfileMenu({ onClose, onNavigate }) {
  const { user, logout } = useAuth();
  const isCompany = user?.accountType === "company";

  const jobseekerItems = [
    { id: "edit-profile", label: "Edit Profile", icon: Edit3 },
    { id: "my-posts", label: "Manage My Posts", icon: FileText },
    { id: "my-jobs", label: "Manage My Jobs", icon: Briefcase },
    { id: "profile-views", label: "Profile Views", icon: Eye },
    { id: "companies-viewed", label: "Companies Viewed", icon: Building2 },
    { id: "my-applications", label: "My Applications", icon: Briefcase },
    { id: "profile-stats", label: "Profile Stats", icon: BarChart3 },
    { id: "saved-posts", label: "Saved Posts", icon: Bookmark },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const companyItems = [
    { id: "edit-profile", label: "Company Profile", icon: Building2 },
    { id: "my-posts", label: "Manage My Posts", icon: FileText },
    { id: "my-jobs", label: "Manage My Jobs", icon: Briefcase },
    { id: "post-job", label: "Post a Job", icon: Plus },
    { id: "professionals", label: "Find Talent", icon: Users },
    { id: "inbox", label: "Company Inbox", icon: Inbox },
    { id: "applications", label: "Applications", icon: Briefcase },
    { id: "billing", label: "Billing & Subscription", icon: CreditCard },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const menuItems = isCompany ? companyItems : jobseekerItems;

  const handleItemClick = (itemId) => {
    console.log("=== PROFILE MENU ITEM CLICKED ===");
    console.log("Item:", itemId);

    const routes = {
      "edit-profile": "edit-profile",
      "my-posts": "my-posts",
      "my-jobs": "my-jobs",
      "post-job": "post-job",
      "professionals": "professionals",
      "inbox": "inbox",
      "applications": "applications",
      "billing": "billing",
      "settings": "settings",
      "upgrade": "company-pricing",
      "profile-views": "profile-views",
      "companies-viewed": "companies-viewed",
      "my-applications": "applications",
      "profile-stats": "profile-stats",
      "saved-posts": "saved-posts",
    };

    if (routes[itemId]) {
      onNavigate(routes[itemId]);
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
              <img src={user.profilePicture} alt="" loading="eager" decoding="async" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              user?.name?.[0] || "U"
            )}
          </div>
          <div>
            <div className="font-semibold text-sm">{user?.name || "User"}</div>
            <div className="text-[10px] text-slate-600">
              {isCompany ? user?.companyName || user?.name : user?.email}
            </div>
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


