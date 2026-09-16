import React from "react";
import { WifiOff, RefreshCw, FileText, Briefcase, Building2, Users, Radio } from "lucide-react";

// 3 variants: "offline", "offline-cached", "empty"
// type: "post" | "job" | "company" | "user" | "channel"
export default function EmptyState({
  variant = "empty",
  type = "post",
  onRetry,
  title,
  subtitle,
  action,
}) {
  const ICONS = {
    post: FileText,
    job: Briefcase,
    company: Building2,
    user: Users,
    channel: Radio,
  };
  const Icon = ICONS[type] || FileText;

  // Offline + no cache
  if (variant === "offline") {
    return (
      <div className="empty-state">
        <div className="empty-icon"><WifiOff size={24} /></div>
        <h2 className="text-sm font-semibold mt-4">You are offline</h2>
        <p className="text-xs text-slate-700 mt-2">
          Check your internet connection and try again.
        </p>
        {onRetry && (
          <button onClick={onRetry} className="outline-button mt-4">
            <RefreshCw size={14} /> Tap to retry
          </button>
        )}
      </div>
    );
  }

  // Offline but cached content exists — shows a slim banner instead
  if (variant === "offline-cached") {
    return (
      <div className="offline-banner">
        <WifiOff size={12} />
        <span>Offline — showing saved content</span>
      </div>
    );
  }

  // Online + empty (default)
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon size={24} /></div>
      <h2 className="text-sm font-semibold mt-4">{title || "Nothing here yet"}</h2>
      {subtitle && <p className="text-xs text-slate-700 mt-2">{subtitle}</p>}
      {action}
    </div>
  );
}
