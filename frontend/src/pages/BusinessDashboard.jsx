import React from "react";
import { Package, MessageCircle, Eye, DollarSign, Plus, Share2, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function BusinessDashboard({ setPage }) {
  const { user } = useAuth();
  const shopSlug = user?.businessSlug || "shop";

  return (
    <div className="page-scroll">
      <div className="page-container">
        {/* Header */}
        <div className="biz-dash-header">
          <div>
            <h1 className="biz-dash-title">{user?.businessName || "My Shop"}</h1>
            <div className="biz-dash-sub">📍 {user?.businessLocation || "Location not set"}</div>
          </div>
          <button className="biz-dash-share-btn" onClick={() => setPage("business-welcome")}>
            <Share2 size={14} /> Share Shop
          </button>
        </div>

        {/* Stats Grid */}
        <div className="biz-dash-stats">
          <div className="biz-stat-card">
            <div className="biz-stat-icon bg-blue-500/10 text-blue-400"><Eye size={18} /></div>
            <div className="biz-stat-val">0</div>
            <div className="biz-stat-label">Views</div>
          </div>
          <div className="biz-stat-card">
            <div className="biz-stat-icon bg-purple-500/10 text-purple-400"><MessageCircle size={18} /></div>
            <div className="biz-stat-val">0</div>
            <div className="biz-stat-label">Inquiries</div>
          </div>
          <div className="biz-stat-card">
            <div className="biz-stat-icon bg-emerald-500/10 text-emerald-400"><DollarSign size={18} /></div>
            <div className="biz-stat-val">$0</div>
            <div className="biz-stat-label">Revenue</div>
          </div>
        </div>

        {/* Empty State / Add Product */}
        <div className="biz-dash-section">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white">My Products</h2>
            <button className="text-xs text-indigo-400 font-semibold" onClick={() => setPage("post-product")}>
              + Add New
            </button>
          </div>

          <div className="biz-empty-products" onClick={() => setPage("post-product")}>
            <Package size={32} className="text-slate-600 mb-2" />
            <div className="text-sm font-semibold text-slate-300">No products yet</div>
            <div className="text-xs text-slate-500 mt-1">Add your first product to start selling.</div>
            <button className="primary-button mt-4"><Plus size={14} /> Add Product</button>
          </div>
        </div>

        {/* Tip of the Day */}
        <div className="biz-dash-tip">
          <div className="text-xs font-bold text-amber-400 mb-1">💡 TIP OF THE DAY</div>
          <div className="text-xs text-slate-300 leading-relaxed">
            Products with photos get 3x more inquiries. Make sure to add a clear picture of your items!
          </div>
        </div>
      </div>
    </div>
  );
}
