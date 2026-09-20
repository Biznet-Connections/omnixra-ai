import React from "react";
import { ArrowLeft, User, Mail, Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function TeamMembersPage({ setPage }) {
  const { user } = useAuth();

  return (
    <div className="page-scroll">
      <div className="page-container">
        <button onClick={() => setPage("settings")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
          <ArrowLeft size={16} /> Back
        </button>

        <h1 className="page-title">Team Members</h1>
        <p className="page-subtitle">People who can manage jobs for your company.</p>

        <div className="space-y-3 mt-7">
          <div className="rounded-xl border border-white/[.06] bg-white/[.02] p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold overflow-hidden">
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                user?.name?.[0]?.toUpperCase() || "?"
              )}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{user?.name}</div>
              <div className="text-[10px] text-slate-500">{user?.email}</div>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">OWNER</span>
          </div>

          <div className="rounded-xl border border-dashed border-white/[.08] bg-white/[.01] p-6 text-center">
            <User size={24} className="mx-auto text-slate-600 mb-3" />
            <h3 className="text-sm font-semibold mb-1">Invite your HR team</h3>
            <p className="text-xs text-slate-500 mb-4">
              Give HR managers and recruiters access to post jobs and review applicants.
            </p>
            <button
              disabled
              className="primary-button opacity-50 cursor-not-allowed"
              title="Coming soon"
            >
              <Plus size={14} /> Invite by email (coming soon)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
