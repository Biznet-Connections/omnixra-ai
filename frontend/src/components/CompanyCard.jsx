import React, { useState } from "react";
import { ShieldCheck, MapPin, Briefcase, Mail, Rocket, Sparkles, UserCheck, FileText, Building2 } from "lucide-react";
import api from "../api/axios";
import PremiumModal from "./PremiumModal";
import LockedFeatureModal from "./LockedFeatureModal";
import PaymentModal from "./PaymentModal";
import { hasTier } from "../utils/tierHelpers";
import InboxHRModal from "./InboxHRModal";
import ProfilePushModal from "./ProfilePushModal";
import { useAuth } from "../context/AuthContext";

function CompanyCard({ company }) {
  const { user } = useAuth();
  const [showPremium, setShowPremium] = useState(false);
  const [showLocked, setShowLocked] = useState(false);
  const [lockedFeature, setLockedFeature] = useState("");
  const [activePlan, setActivePlan] = useState(null);
  const [showInbox, setShowInbox] = useState(false);
  const [showProfilePush, setShowProfilePush] = useState(false);
  const [followed, setFollowed] = useState(false);

  const handlePremiumAction = () => {
    if (!user?.isPremium) {
      setShowPremium(true);
    } else {
      // In real app, would navigate to inbox HR or push profile
      alert("Premium action executed!");
    }
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
                <h3 className="font-semibold text-sm">{company.name}</h3>
                {company.verified && <ShieldCheck size={12} className="text-indigo-400" />}
              </div>
              <div className="text-xs text-slate-600 mt-1">{company.industry || company.category}</div>
              <div className="flex items-center gap-1 text-[10px] text-slate-700 mt-2">
                <MapPin size={11} />
                {company.location || "Location"}
              </div>
            </div>
          </div>
          <button
            onClick={() => setFollowed(!followed)}
            className={`connect-button ${followed ? "connected" : ""}`}
          >
            {followed ? "Following" : "Follow"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="stat-mini">
            <div className="text-sm font-semibold">Open</div>
            <div className="text-[9px] text-slate-700">positions</div>
          </div>
          <div className="stat-mini">
            <div className="text-sm font-semibold">{company.jobs || "â€”"}</div>
            <div className="text-[9px] text-slate-700">jobs</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button onClick={handlePremiumAction} className="outline-button">
            <Mail size={13} />
            Inbox HR
          </button>
          <button onClick={handlePremiumAction} className="outline-button">
            <Rocket size={13} />
            Push My Profile
          </button>
          <button className="outline-button text-indigo-400">
            <Sparkles size={13} />
            Ask AI
          </button>
          <button className="outline-button">
            <FileText size={13} />
            Posts
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
