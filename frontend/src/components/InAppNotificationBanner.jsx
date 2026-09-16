import React, { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";

// In-app banner for foreground push notifications
export default function InAppNotificationBanner() {
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    const handler = (event) => {
      const detail = event.detail || {};
      const title = detail.title || "Omnixra";
      const body = detail.body || "";
      const data = detail.data || {};
      const id = Date.now();
      setBanner({ id, title, body, data });

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setBanner((b) => (b && b.id === id ? null : b));
      }, 5000);
    };

    window.addEventListener("push-foreground", handler);
    return () => window.removeEventListener("push-foreground", handler);
  }, []);

  if (!banner) return null;

  const handleTap = () => {
    const data = banner.data || {};
    if (data.postId) {
      window.dispatchEvent(new CustomEvent("push-navigate", { detail: { page: "home", postId: data.postId } }));
    } else if (data.chatId) {
      window.dispatchEvent(new CustomEvent("push-navigate", { detail: { page: "inbox", chatId: data.chatId } }));
    } else {
      window.dispatchEvent(new CustomEvent("push-navigate", { detail: { page: "home" } }));
    }
    setBanner(null);
  };

  return (
    <div
      className="in-app-notification-banner"
      onClick={handleTap}
      role="alert"
    >
      <div className="in-app-notification-icon">
        <Bell size={16} />
      </div>
      <div className="in-app-notification-body">
        <div className="in-app-notification-title">{banner.title}</div>
        {banner.body ? <div className="in-app-notification-text">{banner.body}</div> : null}
      </div>
      <button
        className="in-app-notification-close"
        onClick={(e) => { e.stopPropagation(); setBanner(null); }}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
