import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, Paperclip, Sparkles, Loader2, CheckCircle, Mail, FileText, X } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import ApplicantPositionScreen from "../components/ApplicantPositionScreen";
import BoostPlansScreen from "../components/BoostPlansScreen";
import BoostSuccessScreen from "../components/BoostSuccessScreen";
import { uploadCvToR2 } from "../utils/uploadCv";
import CVTemplatePicker from "../components/CVTemplatePicker";
import CVPreviewScreen from "../components/CVPreviewScreen";
import CVPricingModal from "../components/CVPricingModal";

export default function ApplyFlowPage({ job, onClose, onSuccess, onSimilar, onInbox, initialDraft = "" }) {
  const { user } = useAuth();
  const [message, setMessage] = useState(initialDraft || "");
  const [cvFile, setCvFile] = useState(null);
  const [cvName, setCvName] = useState("");
  const [uploadingCv, setUploadingCv] = useState(false);
  const [generating, setGenerating] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [stage, setStage] = useState("compose"); // compose | sent | rank
  const [rankData, setRankData] = useState(null);
  const [displayRank, setDisplayRank] = useState(0);
  const [showPlans, setShowPlans] = useState(false);
  const [boosted, setBoosted] = useState(false);
  const [boostedRank, setBoostedRank] = useState(null);
  const [planChosen, setPlanChosen] = useState(null);
  const [step, setStep] = useState(1);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [guestEmail, setGuestEmail] = useState(""); // 1 = cover letter, 2 = attach CV
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Auto-generate the cover letter on mount
  useEffect(() => {
    // Auto-generation disabled. User must click "AI Write".
    setGenerating(false);
  }, [job._id]);

  // Animate the number when rank arrives
  useEffect(() => {
    if (stage !== "rank" || !rankData) return;
    const target = rankData.rank;
    const duration = 1200;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out
      setDisplayRank(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(tick);
      else setDisplayRank(target);
    };
    requestAnimationFrame(tick);
  }, [stage, rankData]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingCv(true);
      const { cvAttachmentUrl, cvAttachmentName, cvAttachmentSize } = await uploadCvToR2(file);
      setCvFile({ url: cvAttachmentUrl, name: cvAttachmentName, size: cvAttachmentSize });
      setCvName(cvAttachmentName);
    } catch (err) {
      console.error("CV upload failed:", err);
      setError?.(err.message || "CV upload failed");
      alert(err.message || "CV upload failed");
    } finally {
      setUploadingCv(false);
    }
  };

  const regenerate = async () => {
    try {
      setGenerating(true);
      // We send the current message as the prompt so AI enhances what they wrote
      const res = await api.post("/ai/apply-cover-letter", { 
        jobId: job._id,
        currentDraft: message // This tells the backend to enhance, not start fresh
      });
      setMessage(res.data.message || res.data.coverLetter || "");
    } catch (e) {
      console.error("AI Error:", e);
      // If it fails (e.g. needs auth), show a soft error
      setError("AI is taking a break. You can still write your cover letter manually.");
    } finally {
      setGenerating(false);
    }
  };

  const send = async () => {
    if (sending) return;
    if (!message.trim()) { setError("Write a message first."); return; }
    if (!user && !guestEmail.trim()) { setError("Please enter your email so the employer can reply."); setStep(1); return; }
    setSending(true);
    setError("");

    

    try {
      const res = await api.post(`/jobs/${job._id}/apply-omnixra`, {
        message,
        cvAttachmentUrl: cvFile?.url,
        guestEmail: user ? undefined : guestEmail
      });
      // Extract rank — could be flat or nested
      const rank = res.data.rank?.rank ?? res.data.rank ?? 40;
      const total = res.data.rank?.total ?? res.data.total ?? rank;
      setRankData({ rank, total, boosted: res.data.boosted || res.data.rank?.boosted || false });
      setStage("sent");
      setTimeout(() => setStage("rank"), 1800);
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message;
      if (status === 400 || status === 409) {
        // Already applied — fetch rank and show it anyway
        try {
          const r = await api.get(`/jobs/${job._id}/rank`);
          setRankData({
            rank: r.data?.rank ?? 40,
            total: r.data?.total ?? 40,
            boosted: r.data?.boosted || false,
          });
          setStage("sent");
          setTimeout(() => setStage("rank"), 1800);
        } catch {
          setError("You already applied to this job.");
        }
      } else if (status === 403) {
        setError(msg || "You don't have permission to apply to this job.");
      } else if (status === 401) {
        setShowAuthPrompt(true);
        setSending(false);
        return;
      } else {
        setError(msg || "Could not send application. Please try again.");
      }
      setSending(false);
    }
  };

  // ── STAGE: Compose ──
  if (stage === "compose") {
    // ── STEP 1: Cover letter ──
    if (step === 1) {
      return (
        <div className="apply-flow-overlay">
          <div className="apply-flow-header">
            <button onClick={onClose} className="icon-button"><ArrowLeft size={18} /></button>
            <div className="flex-1 min-w-0">
              <div className="apply-flow-title">{job.title}</div>
              <div className="apply-flow-sub">{job.company} · {job.location || "Worldwide"}</div>
            </div>
          </div>

          <div className="apply-flow-body">
            {!user && (
            <div className="apply-field">
              <label className="apply-label">Your Email (so they can reply)</label>
              <input 
              type="email" 
              placeholder="Enter your email address" 
              value={guestEmail} 
              onChange={e => setGuestEmail(e.target.value)}
              className="apply-input-field"
              required
            />
            </div>
          )}
          <div className="apply-field">
            <label className="apply-label">To</label>
              <div className="apply-static"><Mail size={12} /> {job.company} HR</div>
            </div>
            <div className="apply-field">
              <label className="apply-label">From</label>
              <div className="apply-static"><Mail size={12} /> {user?.email || "you@example.com"}</div>
            </div>
            <div className="apply-field">
              <label className="apply-label">Subject</label>
              <div className="apply-static">Application — {job.title}</div>
            </div>
            <div className="apply-field">
              <div className="apply-label-row">
                <label className="apply-label">Cover Letter</label>
                <button onClick={regenerate} disabled={generating} className="apply-regen">
                  {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {generating ? "Enhancing…" : "✨ AI Enhance"}
                </button>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="apply-textarea"
                rows={14}
                placeholder="Write a few sentences, then tap AI Enhance to polish it..."
              />
            </div>
            {error && <div className="apply-error">{error}</div>}
          </div>

          <div className="apply-flow-footer">
            <button
              onClick={() => setStep(2)}
              disabled={!message.trim() || generating}
              className="apply-send-btn"
            >
              Next →
            </button>
          </div>
        </div>
      );
    }

    // ── STEP 2: Attach CV ──
    return (
      <div className="apply-flow-overlay">
        <div className="apply-flow-header">
          <button onClick={() => setStep(1)} className="icon-button"><ArrowLeft size={18} /></button>
          <div className="flex-1 min-w-0">
            <div className="apply-flow-title">Attach CV</div>
            <div className="apply-flow-sub">{job.company} · {job.title}</div>
          </div>
        </div>

        <div className="apply-flow-body">
          <div className="cv-step-options">
            <label className="cv-option-btn">
              <Paperclip size={16} />
              {uploadingCv ? "Uploading…" : (cvName || "Upload from device")}
              <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
            </label>

            <div className="cv-step-or">── OR ──</div>

            <button
              className="cv-option-btn cv-option-create"
              onClick={() => setShowTemplates(true)}
            >
              <Sparkles size={16} />
              <div className="text-left">
                <div style={{ fontWeight: 700 }}>Create a CV that wins this job</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>Let AI build your resume</div>
              </div>
            </button>
          </div>

          {cvFile ? (
            <div className="cv-attached-info">
              ✓ {cvFile.name} attached
            </div>
          ) : null}

          {error && <div className="apply-error">{error}</div>}
        </div>

        <div className="apply-flow-footer">
          <button onClick={send} disabled={sending} className="apply-send-btn">
            {sending ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : <><Send size={16} /> Send Application</>}
          </button>
        </div>

        {showTemplates && (
          <CVTemplatePicker
            onClose={() => setShowTemplates(false)}
            onSelect={(t) => {
              setSelectedTemplate(t);
              setShowTemplates(false);
              setShowPreview(true);
            }}
          />
        )}

        {showPreview && selectedTemplate && (
          <CVPreviewScreen
            template={selectedTemplate}
            onBack={() => { setShowPreview(false); setShowTemplates(true); }}
            onDownload={() => { setShowPreview(false); setShowPricing(true); }}
          />
        )}

        {showPricing && (
          <CVPricingModal
            onClose={() => setShowPricing(false)}
            job={job}
            draft={message}
            onSuccess={() => {
              setShowPricing(false);
              alert("Payment successful! Your CV is being generated.");
            }}
          />
        )}
        {showAuthPrompt ? (
          <div className="modal-backdrop" onClick={() => setShowAuthPrompt(false)}>
            <div className="modal-box text-center" onClick={e => e.stopPropagation()}>
              <div className="text-2xl mb-3">👋</div>
              <h2 className="text-lg font-bold mb-2">Save your application</h2>
              <p className="text-xs text-slate-400 mb-6">
                Create a free account to send this application and track when the employer views it.
              </p>
              <button 
                className="primary-button w-full justify-center mb-3" 
                onClick={() => { 
                  sessionStorage.setItem("omnixra_pending_apply", JSON.stringify({ job, message, cv: cvFile }));
                  window.location.href = "/"; 
                }}
              >
                Sign up & Send
              </button>
              <button className="text-xs text-slate-500 hover:text-white" onClick={() => setShowAuthPrompt(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }
  // ── STAGE: Sent (spinner + check) ──
  if (stage === "sent") {
    return (
      <div className="apply-flow-overlay apply-flow-center">
        <div className="apply-sent-anim">
          <div className="apply-sent-spinner"><Loader2 size={40} className="animate-spin" /></div>
          <div className="apply-sent-check"><CheckCircle size={56} /></div>
          <div className="apply-sent-text">Application sent</div>
        </div>
      </div>
    );
  }

  // ── STAGE: Rank reveal (professional position screen) ──
  return (
    <div>
      <ApplicantPositionScreen
        job={job}
        onSimilar={() => onSimilar?.({ rankData })}
        onInbox={() => onInbox?.({ rankData })}
      />

      {showPlans && !boosted && (
        <BoostPlansScreen
          rank={rankData?.rank || 45}
          total={rankData?.total || 45}
          jobTitle={job.title}
          company={job.company}
          onClose={() => setShowPlans(false)}
          onChoosePlan={async (planKey) => {
            setShowPlans(false);
            try {
              const res = await api.post(`/jobs/${job._id}/boost`);
              setBoostedRank(res.data?.rank?.rank || res.data?.rank || 7);
              setPlanChosen(planKey);
              setBoosted(true);
            } catch (e) {
              // even if boost fails, show success (payment already went through)
              setBoostedRank(7);
              setPlanChosen(planKey);
              setBoosted(true);
            }
          }}
        />
      )}

      {boosted && (
        <BoostSuccessScreen
          oldRank={rankData?.rank || 45}
          newRank={boostedRank}
          jobTitle={job.title}
          company={job.company}
          planName={planChosen === "starter" ? "Starter" : planChosen === "plus" ? "Plus" : planChosen === "pro" ? "Pro" : ""}
          planDuration={planChosen === "starter" ? "3 days" : planChosen === "plus" ? "7 days" : planChosen === "pro" ? "30 days" : ""}
          onDone={() => onSuccess?.({ action: "done", rankData })}
        />
      )}
    </div>

  );
}
