import React, { useState } from "react";
import { X, Sparkles, Users, MessageCircle, Loader2, ArrowRight } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function AIMatchingModal({ job, onClose, setPage, onPurchaseCredit }) {
  const { user } = useAuth();
  const [step, setStep] = useState("intro"); // intro | loading | results | no-credits
  const [candidates, setCandidates] = useState([]);
  const [error, setError] = useState("");
  const [creditsLeft, setCreditsLeft] = useState(user?.aiMatchCredits || 0);

  const runMatch = async () => {
    setStep("loading");
    setError("");
    try {
      const res = await api.post(`/jobs/${job._id}/ai-match`);
      setCandidates(res.data.candidates || []);
      setCreditsLeft(res.data.creditsLeft || 0);
      setStep("results");
    } catch (e) {
      if (e?.response?.status === 402) {
        setStep("no-credits");
      } else {
        setError(e?.response?.data?.message || e.message);
        setStep("intro");
      }
    }
  };

  const messageCandidate = async (candidate) => {
    if (!candidate._id) return;
    try {
      const res = await api.post("/messages", { otherUserId: candidate._id });
      onClose();
      setPage?.("inbox");
    } catch (e) {
      alert(e?.response?.data?.message || "Could not open chat");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Sparkles size={16} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold">AI Candidate Matching</h2>
              <div className="text-[10px] text-slate-500 truncate">
                {job?.title}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="icon-button"><X size={18} /></button>
        </div>

        {step === "intro" && (
          <>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Our AI analyzes all applicants + matching profiles, then ranks
              the top 10 candidates for this job.
            </p>

            <div className="rounded-xl border border-white/[.06] bg-white/[.02] p-3 mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Cost</span>
                <span className="font-bold">$5 or 1 AI credit</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Your credits</span>
                <span className="font-bold">{creditsLeft}</span>
              </div>
            </div>

            {error && <div className="text-xs text-red-400 mb-3">{error}</div>}

            {creditsLeft > 0 ? (
              <button onClick={runMatch} className="primary-button w-full">
                <Sparkles size={14} /> Find top 10 candidates
              </button>
            ) : (
              <button onClick={() => setStep("no-credits")} className="primary-button w-full">
                Buy AI Match — $5
              </button>
            )}
          </>
        )}

        {step === "loading" && (
          <div className="text-center py-8">
            <Loader2 className="mx-auto animate-spin text-indigo-400 mb-4" size={40} />
            <p className="text-sm text-slate-400">AI is analyzing candidates...</p>
            <p className="text-[10px] text-slate-600 mt-2">This takes 5-10 seconds</p>
          </div>
        )}

        {step === "results" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold">
                {candidates.length} top candidates
              </div>
              <div className="text-[10px] text-slate-500">
                {creditsLeft} credits left
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {candidates.map((c, i) => (
                <div
                  key={c._id || i}
                  className="flex items-start gap-3 p-3 rounded-xl border border-white/[.06] bg-white/[.02]"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 text-xs font-bold overflow-hidden">
                    {c.profilePicture ? (
                      <img src={c.profilePicture} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      c.name?.[0]?.toUpperCase() || "?"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold truncate">{c.name}</div>
                      {c.source === "applicant" && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                          APPLIED
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                      {c.headline || c.category || "Professional"} · {c.location || "Zimbabwe"}
                    </div>
                    {c.reason && (
                      <div className="text-[10px] text-indigo-300/70 mt-1 italic">
                        {c.reason}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                      {c.score}%
                    </span>
                    <button
                      onClick={() => messageCandidate(c)}
                      className="text-[9px] px-2 py-1 rounded bg-white/[.04] hover:bg-white/[.08] flex items-center gap-1"
                    >
                      <MessageCircle size={10} /> Message
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              className="secondary-button w-full justify-center mt-4"
            >
              Done
            </button>
          </>
        )}

        {step === "no-credits" && (
          <>
            <div className="text-center mb-5">
              <div className="text-3xl mb-2">🤖</div>
              <h3 className="font-bold text-base mb-1">Out of AI Matches</h3>
              <p className="text-xs text-slate-500">
                Buy credits or a bundle to keep finding candidates.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => onPurchaseCredit?.("ai_matching")}
                className="w-full p-3 rounded-xl border border-indigo-500/40 bg-indigo-500/[.04] text-left hover:border-indigo-500/60"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">1 AI Match</div>
                    <div className="text-[10px] text-slate-500">Single match for one job</div>
                  </div>
                  <div className="text-lg font-bold text-indigo-400">$5</div>
                </div>
              </button>

              <button
                onClick={() => onPurchaseCredit?.("bundle_ai_10")}
                className="w-full p-3 rounded-xl border border-amber-500/40 bg-amber-500/[.04] text-left hover:border-amber-500/60"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-2">
                      10 AI Matches
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                        SAVE 60%
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">$2 per match</div>
                  </div>
                  <div className="text-lg font-bold text-amber-400">$20</div>
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
