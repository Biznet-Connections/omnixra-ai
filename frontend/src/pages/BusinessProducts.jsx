import React, { useEffect, useState } from "react";
import { Package, Plus, Share2, Loader2, Eye, MessageCircle } from "lucide-react";
import api from "../api/axios";
import ProductActionsSheet from "../components/ProductActionsSheet";

export default function BusinessProducts({ setPage }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/profile/business/products");
      setProducts(r.data.products || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="page-scroll">
        <div className="page-container">
          <div className="flex justify-center mt-10">
            <Loader2 className="spin text-indigo-400" size={24} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-scroll">
      <div className="page-container">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-white">My Products</h1>
          <button className="primary-button" onClick={() => setPage("post-product")}>
            <Plus size={14} /> Add Product
          </button>
        </div>

        {error ? (
          <div className="text-xs text-red-400 mb-4">{error}</div>
        ) : null}

        {products.length === 0 ? (
          <div className="biz-products-empty">
            <Package size={48} className="text-slate-600 mx-auto mb-3" />
            <h2 className="text-base font-bold text-white mb-1">No products yet</h2>
            <p className="text-xs text-slate-500 mb-5 max-w-xs mx-auto">
              Add your first product so customers can find it on your shop and in their feed.
            </p>
            <button className="primary-button" onClick={() => setPage("post-product")}>
              <Plus size={14} /> Add Your First Product
            </button>
            <button
              className="outline-button mt-3"
              onClick={() => setPage("business-welcome")}
            >
              <Share2 size={14} /> Share Shop Link
            </button>
          </div>
        ) : (
          <div className="biz-products-grid">
            {products.map(p => (
              <div key={p._id} className="biz-product-card" onClick={() => setSelectedProduct(p)} style={{ cursor: "pointer" }}>
                <div className="biz-product-img-wrap">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.name} className="biz-product-img" />
                  ) : (
                    <div className="biz-product-img-placeholder">📦</div>
                  )}
                </div>
                <div className="biz-product-body">
                  <div className="biz-product-name">{p.name}</div>
                  <div className="biz-product-price">${p.price}</div>
                  <div className="biz-product-stats">
                    <span><Eye size={11} /> {p.views || 0}</span>
                    <span><MessageCircle size={11} /> {p.inquiries || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {selectedProduct ? (
          <ProductActionsSheet
            product={{ ...selectedProduct, _shopSlug: window.location.pathname.split("/").pop() }}
            onClose={() => setSelectedProduct(null)}
            onEdit={() => {
              sessionStorage.setItem("edit_product_id", selectedProduct._id);
              setPage("edit-product");
            }}
            onDeleted={() => { setSelectedProduct(null); load(); }}
            onStatusChange={() => load()}
          />
        ) : null}
      </div>
    </div>
  );
}
