import React, { useEffect, useState } from "react";
import { MapPin, Phone, MessageCircle, Star, Package } from "lucide-react";
import api from "../api/axios";
import LoadingDots from "../components/LoadingDots";

export default function PublicShopPage({ slug, setPage }) {
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) { setError("No shop specified"); setLoading(false); return; }
    console.log("[public shop] fetching:", `/public/shop/${slug}`);
    api.get(`/profile/public/shop/${slug}`)
      .then(r => {
        setShop(r.data.user);
        setProducts(r.data.products || []);
      })
      .catch(e => setError(e.response?.data?.message || "Shop not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="flex justify-center mt-20"><LoadingDots /></div>;
  if (error) return <div className="text-center mt-20 text-slate-500">{error}</div>;

  return (
    <div className="public-shop-page">
      {/* Banner */}
      <div className="public-shop-banner">
        <div className="public-shop-avatar">
          {(shop.businessName || "S")[0].toUpperCase()}
        </div>
      </div>

      <div className="public-shop-header">
        <h1 className="public-shop-name">{shop.businessName}</h1>
        <div className="public-shop-meta">
          {shop.businessCategory && <span>{shop.businessCategory}</span>}
          {shop.businessLocation && (
            <span><MapPin size={12} /> {shop.businessLocation}</span>
          )}
        </div>
        {shop.businessAbout && <p className="public-shop-about">{shop.businessAbout}</p>}
      </div>

      {/* Contact buttons */}
      <div className="public-shop-contacts">
        {shop.businessWhatsApp && (
          <a
            href={`https://wa.me/${shop.businessWhatsApp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="public-shop-contact-btn wa"
          >
            <MessageCircle size={16} /> WhatsApp
          </a>
        )}
        {shop.businessPhone && (
          <a href={`tel:${shop.businessPhone}`} className="public-shop-contact-btn call">
            <Phone size={16} /> Call
          </a>
        )}
      </div>

      {/* Products */}
      <div className="public-shop-products-section">
        <h2 className="public-shop-section-title">
          <Package size={16} /> Products ({products.length})
        </h2>
        {products.length === 0 ? (
          <div className="public-shop-empty">No products listed yet.</div>
        ) : (
          <div className="public-shop-grid">
            {products.map(p => (
              <div
                key={p._id}
                className="public-product-card"
                onClick={() => { window.location.href = `/shop/${slug}/p/${p._id}`; }}
                style={{ cursor: "pointer" }}
              >
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.name} className="public-product-img" />
                ) : (
                  <div className="public-product-img-placeholder">📦</div>
                )}
                <div className="public-product-body">
                  <div className="public-product-name">{p.name}</div>
                  <div className="public-product-price">${p.price}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA — sign up as business owner */}
      <div className="public-shop-cta">
        <div className="public-shop-cta-icon">🏪</div>
        <div className="public-shop-cta-body">
          <div className="public-shop-cta-title">Own a business?</div>
          <div className="public-shop-cta-sub">
            Get your free shop on Omnixra. Reach thousands of customers.
          </div>
        </div>
        <a
          href="/?signup=business"
          className="public-shop-cta-btn"
        >
          Start free →
        </a>
      </div>

      <div className="public-shop-footer">
        <span>Powered by </span>
        <strong>omnixra-AI</strong>
      </div>
    </div>
  );
}
