import React, { useState } from "react";
import { Copy, Check, QrCode, Share2, ArrowRight, Download } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function BusinessWelcomeScreen({ setPage }) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const slug = user?.businessSlug || user?.businessName?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "shop";
  const shopUrl = `https://omnixra-ai.com/shop/${slug}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shopUrl)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shopUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(shopUrl);
    }
  };

  const shareWhatsApp = () => {
    const text = `Check out my shop on Omnixra: ${shopUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const downloadQR = async () => {
    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}-qr.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Could not download QR. Right-click the QR image and save.");
    }
  };

  return (
    <div className="business-welcome-screen">
      <div className="business-welcome-card">
        <div className="business-welcome-emoji">🎉</div>
        <h1 className="business-welcome-title">You're Live!</h1>
        <p className="business-welcome-sub">
          <strong>{user?.businessName || user?.name}</strong> is now online. Share your shop link to start getting customers.
        </p>

        {/* Shop Link */}
        <div className="business-welcome-section">
          <div className="business-welcome-label">📱 YOUR SHOP LINK</div>
          <div className="business-welcome-link-box">
            <div className="business-welcome-url">{shopUrl}</div>
            <button className="business-welcome-btn-small" onClick={copyLink}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* QR Code */}
        <div className="business-welcome-section">
          <div className="business-welcome-label">📸 YOUR QR CODE</div>
          <div className="business-welcome-qr-box">
            <img src={qrUrl} alt="Shop QR" className="business-welcome-qr" />
            <p className="business-welcome-hint">
              Print this and stick it on your shop window. Every scan brings a customer to Omnixra.
            </p>
            <button className="business-welcome-btn-secondary" onClick={downloadQR}>
              <Download size={14} /> Download QR
            </button>
          </div>
        </div>

        {/* Share buttons */}
        <div className="business-welcome-actions">
          <button className="business-welcome-btn-wa" onClick={shareWhatsApp}>
            <Share2 size={16} /> Share to WhatsApp
          </button>
          <button className="business-welcome-btn-next" onClick={() => setPage("business-dashboard")}>
            Go to Dashboard <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
