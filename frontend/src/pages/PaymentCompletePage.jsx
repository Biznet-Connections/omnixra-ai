import React, { useEffect, useState } from "react";
import api from "../api/axios";

export default function PaymentCompletePage({ setPage }) {
  const [status, setStatus] = useState("loading");
  const [reference, setReference] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference") || params.get("merchantRef") || "";
    setReference(ref);
    if (!ref) { setStatus("unknown"); return; }

    let tries = 0;
    const iv = setInterval(async () => {
      tries++;
      try {
        const res = await api.get("/payments/status/" + ref);
        if (res.data.status === "paid") { setStatus("paid"); clearInterval(iv); }
        else if (res.data.status === "failed") { setStatus("failed"); clearInterval(iv); }
      } catch (e) {}
      if (tries > 20) { clearInterval(iv); setStatus("timeout"); }
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white p-6">
      <h1 className="text-xl font-bold mb-3">
        {status === "loading" && "Checking payment..."}
        {status === "paid" && "Payment confirmed"}
        {status === "failed" && "Payment failed"}
        {status === "timeout" && "Still waiting..."}
        {status === "unknown" && "No reference found"}
      </h1>
      {reference && <p className="text-white/50 text-sm mb-4">Ref: {reference}</p>}
      <button
        onClick={() => setPage("home")}
        className="px-6 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500"
      >
        Back to app
      </button>
    </div>
  );
}
