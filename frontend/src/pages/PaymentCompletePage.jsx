import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function PaymentCompletePage({ setPage }) {
  const [status, setStatus] = useState("loading");
  const [reference, setReference] = useState("");

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
        if (res.data.status === "paid") { setStatus("paid"); clearInterval(iv); }
        else if (res.data.status === "failed") { setStatus("failed"); clearInterval(iv); }
      } catch (e) {}
      if (tries >= maxTries) { clearInterval(iv); setStatus("timeout"); }
    }, 3000);
    return () => clearInterval(iv);
  }, []);

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
          Your features are now active. Head back to the app to use them.
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
