import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, Paperclip, Sparkles, Loader2, CheckCircle, Mail, FileText, X } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import ApplicantPositionScreen from "../components/ApplicantPositionScreen";
import BoostPlansScreen from "../components/BoostPlansScreen";
import BoostSuccessScreen from "../components/BoostSuccessScreen";

export default function ApplyFlowPage({ job, onClose, onSuccess }) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [cvFile, setCvFile] = useState(null);
  const [cvName, setCvName] = useState("");
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

  // Auto-generate the cover letter on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setGenerating(true);
        const res = await api.post("/ai/apply-cover-letter", { jobId: job._id });
        if (!cancelled) setMessage(res.data.message || res.data.coverLetter || "");
      } catch (e) {
        if (!cancelled) {
          setMessage(`Dear Hiring Manager,\n\nI am writing to apply for the ${job.title} position at ${job.company}. I believe my background and skills make me a strong fit.\n\nI would welcome the opportunity to discuss how I can contribute.\n\nYours faithfully,\n${user?.name || ""}`);
        }
      } finally {
        if (!cancelled) setGenerating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [job._id, job.title, job.company]);

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCvName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => setCvFile(reader.result);
    reader.readAsDataURL(file);
  };

  const regenerate = async () => {
    try {
      setGenerating(true);
      const res = await api.post("/ai/apply-cover-letter", { jobId: job._id });
      setMessage(res.data.message || res.data.coverLetter || "");
    } catch {
      setError("Could not regenerate. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const send = async () => {
    if (sending) return;
    if (!message.trim()) { setError("Write a message first."); return; }
    setSending(true);
    setError("");
    try {
      const res = await api.post(`/jobs/${job._id}/apply-omnixra`, {
        message,
        cvAttachment: cvFile,
        cvName: cvName || null,
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
        setError("Please sign in again.");
      } else {
        setError(msg || "Could not send application. Please try again.");
      }
      setSending(false);
    }
  };

  // ── STAGE: Compose ──
  if (stage === "compose") {
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
                {generating ? "Writing…" : "AI Write"}
              </button>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="apply-textarea"
              rows={14}
              placeholder={generating ? "AI is drafting your cover letter…" : "Write your cover letter…"}
            />
          </div>

          <div className="apply-field">
            <label className="apply-label">Attached CV</label>
            <label className="apply-cv-btn">
              <Paperclip size={14} />
              {cvName || "Attach CV (PDF/DOC)"}
              <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          {error && <div className="apply-error">{error}</div>}
        </div>

        <div className="apply-flow-footer">
          <button onClick={send} disabled={sending || generating} className="apply-send-btn">
            {sending ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : <><Send size={16} /> Send Application</>}
          </button>
        </div>
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
        rank={rankData?.rank || 45}
        total={rankData?.total || 45}
        job={job}
        onBoost={() => setShowPlans(true)}
        onSimilar={() => onSuccess?.({ action: "similar", rankData })}
        onSkip={() => onSuccess?.({ action: "skip", rankData })}
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
