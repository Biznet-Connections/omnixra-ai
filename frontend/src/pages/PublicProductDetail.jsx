import React, { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Phone, MessageCircle, ShieldCheck, Package } from "lucide-react";
import api from "../api/axios";
import LoadingDots from "../components/LoadingDots";

const AVATAR_COLORS = ["#6366f1","#8b5cf6","#ec4899","#ef4444","#f59e0b","#10b981","#06b6d4","#3b82f6"];
function colorFor(name) {
  if (!name) return "#6366f1";
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function PublicProductDetail({ slug, productId, setPage }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imgIdx, setImgIdx] = useState(0);
  const [showMessageCompose, setShowMessageCompose] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");
  const [messageId, setMessageId] = useState(null);
  // Contact step
  const [contactType, setContactType] = useState("email");
  const [contactValue, setContactValue] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const [saveContactError, setSaveContactError] = useState("");
  const [contactSaved, setContactSaved] = useState("");

  useEffect(() => {
    api.get(`/profile/public/shop/${slug}/product/${productId}`)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.message || "Not found"))
      .finally(() => setLoading(false));
  }, [slug, productId]);

  const goToShop = () => {
    window.location.href = `/shop/${slug}`;
  };

  const handleMessage = () => {
    setMessageText(`Hi, is "${data?.product?.name || "this product"}" still available?`);
    setSent(false);
    setSendError("");
    setContactType("email");
    // Pre-fill contact for logged-in users
    const storedUser = localStorage.getItem("omnixra_user");
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setContactValue(u?.email || "");
      } catch { setContactValue(""); }
    } else {
      setContactValue("");
    }
    setContactSaved("");
    setSaveContactError("");
    setShowMessageCompose(true);
  };

  const sendMessage = async () => {
    if (!messageText.trim()) { setSendError("Write a message first"); return; }
    setSending(true);
    setSendError("");
    try {
      const r = await api.post(`/profile/public/shop/${slug}/message`, {
        productId: data?.product?._id,
        text: messageText.trim(),
      });
      setMessageId(r.data.messageId);
      setSent(true);
      // Always show contact picker — even logged-in users might want a different contact channel
    } catch (e) {
      setSendError(e.response?.data?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const saveContact = async () => {
    if (!contactValue.trim()) { setSaveContactError("Enter your contact"); return; }
    setSavingContact(true);
    setSaveContactError("");
    try {
      await api.put(`/profile/public/message/${messageId}/contact`, {
        replyVia: contactType,
        value: contactValue.trim(),
      });
      setContactSaved(contactType === "email" ? "email" : contactType === "whatsapp" ? "WhatsApp" : "call");
    } catch (e) {
      setSaveContactError(e.response?.data?.message || "Failed to save");
    } finally {
      setSavingContact(false);
    }
  };

  if (loading) return <div className="flex justify-center mt-20"><LoadingDots /></div>;
  if (error) return (
    <div className="public-detail-screen">
      <div className="public-detail-error">
        <p>{error}</p>
        <button onClick={goToShop} className="primary-button mt-4">← Back to shop</button>
      </div>
    </div>
  );

  const { product, shop } = data;
  const images = product.images?.length ? product.images : [];
  const shopInitial = (shop.businessName || "?")[0].toUpperCase();
  const shopColor = colorFor(shop.businessName);
  const whatsappUrl = shop.businessWhatsApp
    ? `https://wa.me/${shop.businessWhatsApp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I'm interested in "${product.name}"`)}`
    : null;

  return (
    <div className="public-detail-screen">
      <header className="public-detail-header">
        <button onClick={goToShop} className="public-detail-back">
          <ArrowLeft size={18} />
        </button>
        <div className="public-detail-header-title">Product Details</div>
        <div style={{ width: 30 }} />
      </header>

      {/* Image Carousel */}
      <div className="public-detail-carousel">
        {images.length > 0 ? (
          <img src={images[imgIdx]} alt={product.name} className="public-detail-img" />
        ) : (
          <div className="public-detail-img-placeholder">📦</div>
        )}
        {images.length > 1 && (
          <div className="public-detail-dots">
            {images.map((_, i) => (
              <button
                key={i}
                className={`public-detail-dot ${i === imgIdx ? "active" : ""}`}
                onClick={() => setImgIdx(i)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="public-detail-body">
        <h1 className="public-detail-name">{product.name}</h1>
        <div className="public-detail-price">${product.price}</div>

        {/* Shop info */}
        <div className="public-detail-shop">
          <div className="public-detail-shop-avatar" style={{ background: shopColor }}>
            {shop.businessLogo ? (
              <img src={shop.businessLogo} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
            ) : shopInitial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="public-detail-shop-name">
              {shop.businessName}
              {shop.businessVerified && <ShieldCheck size={12} className="text-blue-400 inline ml-1" />}
            </div>
            {shop.businessLocation && (
              <div className="public-detail-shop-loc"><MapPin size={11} /> {shop.businessLocation}</div>
            )}
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="public-detail-desc-section">
            <div className="public-detail-label">Description</div>
            <p className="public-detail-desc">{product.description}</p>
          </div>
        )}

        {/* Contact actions */}
        <div className="public-detail-actions">
          <button className="public-detail-action-primary" onClick={handleMessage}>
            <MessageCircle size={16} /> Message Seller
          </button>
          <div className="public-detail-action-row">
            {shop.businessPhone && (
              <a href={`tel:${shop.businessPhone}`} className="public-detail-action-secondary">
                <Phone size={14} /> Call
              </a>
            )}
            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="public-detail-action-wa">
                <MessageCircle size={14} /> WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Own a business CTA */}
        <div className="public-detail-cta">
          <div className="public-detail-cta-icon">🏪</div>
          <div className="flex-1">
            <div className="public-detail-cta-title">Own a business?</div>
            <div className="public-detail-cta-sub">Get your free shop on Omnixra</div>
          </div>
          <a href="/?signup=business" className="public-detail-cta-btn">Start free →</a>
        </div>

        <div className="public-detail-footer">Powered by omnixra-AI</div>
      </div>

      {/* Auth gate modal */}
      {showMessageCompose && (
        <div className="modal-backdrop" onClick={() => setShowMessageCompose(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <button
              onClick={() => setShowMessageCompose(false)}
              style={{ position: "absolute", top: 12, right: 12, background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: 20 }}
            >×</button>

            {/* STEP 1 — Sent confirmation + soft contact ask */}
            {sent ? (
              <div style={{ padding: "8px 0" }}>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
                  <h2 className="text-base font-bold text-white">Message sent!</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    To get a reply, how should {shop.businessName} reach you?
                  </p>
                </div>

                {contactSaved ? (
                  <div style={{ textAlign: "center", padding: "16px 0" }}>
                    <p className="text-sm text-emerald-400 mb-4">
                      ✅ {shop.businessName} will reach you via {contactSaved}.
                    </p>
                    <button className="primary-button w-full justify-center" onClick={() => setShowMessageCompose(false)}>
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="contact-option-grid">
                      <button
                        className={`contact-option-btn ${contactType === "email" ? "active" : ""}`}
                        onClick={() => setContactType("email")}
                      >
                        📧 Email
                      </button>
                      <button
                        className={`contact-option-btn ${contactType === "whatsapp" ? "active" : ""}`}
                        onClick={() => setContactType("whatsapp")}
                      >
                        💬 WhatsApp
                      </button>
                      <button
                        className={`contact-option-btn ${contactType === "call" ? "active" : ""}`}
                        onClick={() => setContactType("call")}
                      >
                        📞 Call
                      </button>
                    </div>

                    <div className="biz-post-field" style={{ marginTop: 12 }}>
                      <input
                        type={contactType === "email" ? "email" : "tel"}
                        className="biz-post-input"
                        placeholder={
                          contactType === "email" ? "you@example.com" :
                          contactType === "whatsapp" ? "+263 77 123 4567" :
                          "+263 77 123 4567"
                        }
                        value={contactValue}
                        onChange={e => setContactValue(e.target.value)}
                      />
                    </div>

                    {saveContactError ? (
                      <div className="text-xs text-red-400 mt-2">{saveContactError}</div>
                    ) : null}

                    <button
                      className="primary-button w-full justify-center mt-3"
                      disabled={!contactValue.trim() || savingContact}
                      onClick={saveContact}
                    >
                      {savingContact ? "Saving…" : "Save contact info"}
                    </button>
                    <button
                      className="w-full text-xs text-slate-500 hover:text-white mt-3 py-2"
                      onClick={() => setShowMessageCompose(false)}
                    >
                      Skip — just close
                    </button>
                  </>
                )}
              </div>
            ) : (
              // STEP 0 — Compose
              <>
                <h2 className="text-base font-bold text-white mb-1">
                  💬 Message {shop.businessName}
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  About "{product.name}"
                </p>

                <textarea
                  className="biz-post-input"
                  rows={4}
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="Type your question..."
                />

                {sendError ? <div className="text-xs text-red-400 mt-2">{sendError}</div> : null}

                <button
                  className="primary-button w-full justify-center mt-4"
                  disabled={sending || !messageText.trim()}
                  onClick={sendMessage}
                >
                  {sending ? "Sending…" : "Send Message"}
                </button>

                <div className="text-center text-[10px] text-slate-600 mt-3">
                  Or contact directly:
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="outline-button"
                      style={{ flex: 1, justifyContent: "center", color: "#25d366", borderColor: "rgba(37,211,102,0.3)" }}
                    >
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                  )}
                  {shop.businessPhone && (
                    <a
                      href={`tel:${shop.businessPhone}`}
                      className="outline-button"
                      style={{ flex: 1, justifyContent: "center" }}
                    >
                      <Phone size={14} /> Call
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
