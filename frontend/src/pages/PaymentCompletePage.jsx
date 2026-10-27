import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function PaymentCompletePage({ setPage }) {
  const [status, setStatus] = useState("loading");
  const [reference, setReference] = useState("");
  const [resumeAction, setResumeAction] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference") || "";
    const shortUrl = params.get("short_url") || "";
    const paymentRef = params.get("payment_reference") || "";
    setReference(ref);
    if (!ref) { setStatus("unknown"); return; }

    let tries = 0;
    const maxTries = 25;
    const iv = setInterval(async () => {
      tries++;
      try {
        const qs = new URLSearchParams();
        if (shortUrl) qs.set("short_url", shortUrl);
        if (paymentRef) qs.set("payment_reference", paymentRef);
        const res = await api.get("/payments/status/" + ref + (qs.toString() ? "?" + qs.toString() : ""));
        if (res.data.status === "paid") { 
          setStatus("paid"); 
          clearInterval(iv); 
          
          // Check if we have a return state
          const returnStateStr = sessionStorage.getItem("omnixra_return_state");
          if (returnStateStr) {
            try {
              const returnState = JSON.parse(returnStateStr);
              // Only use it if it was set in the last 30 minutes
              if (Date.now() - returnState.timestamp < 30 * 60 * 1000) {
                setResumeAction(returnState);
              }
            } catch (e) { console.error("Bad return state", e); }
          }
        }
        else if (res.data.status === "failed") { setStatus("failed"); clearInterval(iv); }
      } catch (e) {}
      if (tries >= maxTries) { clearInterval(iv); setStatus("timeout"); }
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  // ── When payment reaches ANY final state, redirect back to the APK ──
  useEffect(() => {
    const finalStates = ["paid", "failed", "timeout", "unknown"];
    if (!finalStates.includes(status)) return;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isNative = typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.();
    
    // If we have a resume action, handle it inside the web app for a second, then go home
    if (resumeAction) {
      const t = setTimeout(() => {
        // Clear it so we dont accidentally run it twice
        sessionStorage.removeItem("omnixra_return_state");
        
        // If it was a CV purchase, we navigate to the jobs page and trigger the resume
        if (resumeAction.action === "cv_purchased") {
           setPage("jobs");
           // We will add an event listener in JobsPage to catch this
           setTimeout(() => {
             window.dispatchEvent(new CustomEvent("resume-cv-purchase", { detail: resumeAction }));
           }, 500);
        }
        
        if (resumeAction.action === "push_profile") {
          setPage("companies");
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("resume-push-profile", { detail: resumeAction }));
          }, 500);
        }
      }, 1500);
      return () => clearTimeout(t);
    }

    if (!isMobile || isNative) return;

    const params = new URLSearchParams();
    if (reference) params.set("reference", reference);
    params.set("status", status);
    const qs = params.toString();

    // Strategy: Universal Link first (no popup on verified devices), custom scheme as fallback
    const t1 = setTimeout(() => {
      console.log("[payment-return] trying universal link");
      window.location.href = "https://omnixra-ai.com/app/payment-success?" + qs;
    }, 1200);

    // Fallback: custom scheme 800ms later if universal link didn't take us out
    const t2 = setTimeout(() => {
      console.log("[payment-return] trying custom scheme fallback");
      window.location.href = "omnixra://payment-success?" + qs;
    }, 2000);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [status, reference]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white p-6">
      {status === "loading" && <Loader2 className="animate-spin text-indigo-400 mb-4" size={48} />}
      {status === "paid" && <CheckCircle className="text-emerald-400 mb-4" size={64} />}
      {(status === "failed" || status === "timeout") && <XCircle className="text-red-400 mb-4" size={64} />}

      <h1 className="text-xl font-bold mb-2">
        {status === "loading" && "Confirming payment..."}
        {status === "paid" && "Payment confirmed"}
        {status === "failed" && "Payment failed"}
        {status === "timeout" && "Still confirming..."}
        {status === "unknown" && "No reference found"}
      </h1>

      {status === "paid" && (
        <p className="text-sm text-white/60 mb-4 text-center">
          {resumeAction 
            ? "Payment confirmed. Resuming your application..." 
            : "Your features are now active."}
        </p>
      )}

      {reference && <p className="text-white/40 text-xs mb-4">Ref: {reference}</p>}

      <button
        onClick={() => setPage("home")}
        className="primary-button px-6"
      >
        Back to app
      </button>
    </div>
  );
}
