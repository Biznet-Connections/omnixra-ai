import React, { useState } from "react";
import { X, Edit3, Package, Share2, Zap, Trash2, Loader2 } from "lucide-react";
import api from "../api/axios";

export default function ProductActionsSheet({ product, onClose, onEdit, onDeleted, onStatusChange }) {
  const [busy, setBusy] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const markSold = async () => {
    setBusy("sold");
    try {
      await api.put(`/profile/business/product/${product._id}`, { status: product.status === "sold" ? "active" : "sold" });
      onStatusChange(product.status === "sold" ? "active" : "sold");
      onClose();
    } catch (e) {
      alert(e.response?.data?.message || "Failed");
    } finally { setBusy(null); }
  };

  const del = async () => {
    setBusy("delete");
    try {
      await api.delete(`/profile/business/product/${product._id}`);
      onDeleted();
      onClose();
    } catch (e) {
      alert(e.response?.data?.message || "Failed");
    } finally { setBusy(null); }
  };

  const share = async () => {
    const url = `${window.location.origin}/shop/${product._shopSlug || ""}/p/${product._id}`;
    const text = `🔥 ${product.name}\n💰 $${product.price}\n\nView: ${url}`;
    try {
      await navigator.clipboard.writeText(text);
      alert("Product caption copied! Paste it on WhatsApp");
    } catch {
      alert(text);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="product-actions-sheet" onClick={e => e.stopPropagation()}>
        <button className="product-actions-close" onClick={onClose}><X size={18} /></button>

        <div className="product-actions-header">
          {product.images?.[0] ? (
            <img src={product.images[0]} alt="" className="product-actions-img" />
          ) : (
            <div className="product-actions-img-placeholder">📦</div>
          )}
          <div className="flex-1">
            <div className="product-actions-name">{product.name}</div>
            <div className="product-actions-price">${product.price}</div>
            <div className="product-actions-stats">
              👁 {product.views || 0} views · 💬 {product.inquiries || 0} inquiries
            </div>
          </div>
        </div>

        <div className="product-actions-list">
          <button className="product-action-row" onClick={() => { onEdit(); onClose(); }}>
            <Edit3 size={16} /> <span>Edit Product</span>
          </button>
          <button className="product-action-row" onClick={markSold} disabled={busy === "sold"}>
            {busy === "sold" ? <Loader2 size={16} className="spin" /> : <Package size={16} />}
            <span>{product.status === "sold" ? "Mark as Available" : "Mark as Sold"}</span>
          </button>
          <button className="product-action-row" onClick={share}>
            <Share2 size={16} /> <span>Share Product Link</span>
          </button>
          <button className="product-action-row product-action-boost" onClick={() => alert("Boost coming soon")}>
            <Zap size={16} /> <span>Boost (get more views)</span>
          </button>

          {!confirmingDelete ? (
            <button className="product-action-row product-action-danger" onClick={() => setConfirmingDelete(true)}>
              <Trash2 size={16} /> <span>Delete Product</span>
            </button>
          ) : (
            <div className="product-delete-confirm">
              <div className="product-delete-warn">
                ⚠️ Delete "{product.name}"? This cannot be undone.
              </div>
              <div className="product-delete-buttons">
                <button onClick={() => setConfirmingDelete(false)}>Cancel</button>
                <button onClick={del} disabled={busy === "delete"}>
                  {busy === "delete" ? "Deleting…" : "Delete Forever"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
