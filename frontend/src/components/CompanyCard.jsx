import React, { useState } from "react";
import { ShieldCheck, MapPin, Briefcase, Mail, Rocket, Sparkles, UserCheck, FileText, Building2, UserPlus } from "lucide-react";
import api from "../api/axios";
import { useFollowing } from "../context/FollowingContext";
import PremiumModal from "./PremiumModal";
import LockedFeatureModal from "./LockedFeatureModal";
import PaymentModal from "./PaymentModal";
import { hasTier } from "../utils/tierHelpers";
import InboxHRModal from "./InboxHRModal";
import ProfilePushModal from "./ProfilePushModal";
import { useAuth } from "../context/AuthContext";
import { useGuest } from "../context/GuestContext";
import VerifiedBadge from "./VerifiedBadge";

function CompanyCard({ company, setPage, onPushProfile }) {
  const { isFollowingCompany, toggleFollowCompany } = useFollowing();
  const { user } = useAuth();
  const { requireAuth } = useGuest();
  const [showPremium, setShowPremium] = useState(false);
  const [showLocked, setShowLocked] = useState(false);
  const [lockedFeature, setLockedFeature] = useState("");
  const [activePlan, setActivePlan] = useState(null);
  const [showInbox, setShowInbox] = useState(false);
  const [showProfilePush, setShowProfilePush] = useState(false);
  const [followed, setFollowed] = useState(false);
  const handleFollow = async (e) => {
    e.stopPropagation();
    await toggleFollowCompany(company._id);
  };

  const handleInboxHR = () => {
    if (!user) { requireAuth("message", { name: company?.name }); return; }
    if (!hasTier(user, "starter")) {
      setLockedFeature("Inbox HR");
      setShowLocked(true);
      return;
    }
    setShowInbox(true);
  };

  const handlePushProfile = () => {
    if (!user) { requireAuth("pushcv", { company: company?.name }); return; }
    if (!hasTier(user, "starter")) {
      setLockedFeature("Push My Profile");
      setShowLocked(true);
      return;
    }
    setShowProfilePush(true);
  };

  const handleAskAI = () => {
    if (!user) { requireAuth("ai"); return; }
    const name = company?.name || "this company";
    const prompt = `Tell me about ${name} — what they do, what jobs they have open, and whether I should reach out. My profile: ${user?.category || "General"}, ${user?.location || "Worldwide"}`;
    sessionStorage.setItem("ai_auto_prompt", prompt);
    setPage?.("myai");
  };

  const handleViewPosts = () => {
    sessionStorage.setItem("company_posts_id", company?._id || "");
    sessionStorage.setItem("company_posts_name", company?.name || "");
    setPage?.("company-posts");
  };

  return (
    <>
      <div className="company-card">
        <div className="flex items-start justify-between">
          <div className="flex gap-3">
            <div className="company-logo bg-gradient-to-br from-indigo-500 to-blue-600">
              {company.name?.[0] || "C"}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-sm flex items-center gap-1.5">
                {company.name}
                {(company.verifiedBadge || company.verified) && (
                  <VerifiedBadge size="sm" color="blue" label="Verified Company" showTooltip={false} />
                )}
              </h3>
                {company.verified && <ShieldCheck size={12} className="text-indigo-400" />}
              </div>
              <div className="text-xs text-slate-600 mt-1">{company.industry || company.category}</div>
              <div className="flex items-center gap-1 text-[10px] text-slate-700 mt-2">
                <MapPin size={11} />
                {company.location || "Location"}
              </div>
            </div>
          </div>
        </div>

        <div className="company-card-actions">
          <button
            className="company-action-btn"
            onClick={(e) => { e.stopPropagation(); handleViewPosts(); }}
          >
            Posts
          </button>
          <button
            className="company-action-btn"
            onClick={handleFollow}
          >{isFollowingCompany(company._id) ? "Following" : "Follow"}</button>
          <button
            className="company-action-btn"
            onClick={(e) => { e.stopPropagation(); onPushProfile && onPushProfile(company); }}
          >
            Push Profile
          </button>
        </div>
      </div>

      {showPremium && <PremiumModal onClose={() => setShowPremium(false)} />}
      {showInbox && (
        <InboxHRModal
          company={company}
          onClose={() => setShowInbox(false)}
          onOpenChat={(conversationId) => {
            setShowInbox(false);
            if (conversationId) {
              window.location.hash = `#chat/${conversationId}`;
            }
          }}
        />
      )}
      {showProfilePush && (
        <ProfilePushModal
          company={company}
          onClose={() => setShowProfilePush(false)}
          onOpenChat={(conversationId) => {
            setShowProfilePush(false);
            if (conversationId) {
              window.location.hash = `#chat/${conversationId}`;
            }
          }}
        />
      )}
      {showLocked && (
        <LockedFeatureModal
          featureName={lockedFeature}
          requiredTier="plus"
          description="Upgrade to contact companies directly."
          onClose={() => setShowLocked(false)}
          onChoosePlan={(planKey) => { setShowLocked(false); setActivePlan(planKey); }}
          onSeePricing={() => { setShowLocked(false); setShowPremium(true); }}
        />
      )}
      {activePlan && (
        <PaymentModal
          planKey={activePlan}
          onClose={() => setActivePlan(null)}
          onSuccess={() => setActivePlan(null)}
        />
      )}
    </>
  );
}

export default CompanyCard;
