import React, { useState, useEffect } from "react";
import { ArrowLeft, Ticket, Plus, Copy, Check } from "lucide-react";
import api from "../api/axios";

function AdminVouchers({ setPage }) {
  const [vouchers, setVouchers] = useState([]);
  const [newVoucher, setNewVoucher] = useState({ code: "", durationDays: 30 });
  const [generating, setGenerating] = useState(false);
  const [bulkCount, setBulkCount] = useState(5);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    api.get("/admin/vouchers").then(res => setVouchers(res.data)).catch(() => {});
  }, []);

  const generateCode = () => {
    return "OMNI-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createSingle = async () => {
    const code = newVoucher.code || generateCode();
    try {
      const res = await api.post("/admin/vouchers", { code, durationDays: newVoucher.durationDays });
      setVouchers([res.data, ...vouchers]);
      setNewVoucher({ code: "", durationDays: 30 });
    } catch (err) { alert(err.response?.data?.message || "Error"); }
  };

  const createBulk = async () => {
    setGenerating(true);
    try {
      const codes = Array.from({ length: bulkCount }, () => generateCode());
      for (const code of codes) {
        const res = await api.post("/admin/vouchers", { code, durationDays: 30 });
        setVouchers(prev => [res.data, ...prev]);
      }
    } catch (err) { alert("Error generating vouchers"); }
    finally { setGenerating(false); }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="admin-root">
      <div className="admin-grid-bg" />
      <div className="admin-content">
        <button onClick={() => setPage("admin")} className="admin-back-btn">
          <ArrowLeft size={16} /> BACK
        </button>

        <div className="admin-header">
          <div className="admin-header-left">
            <div className="admin-header-orb"><Ticket size={20} /></div>
            <div>
              <h1 className="admin-header-title">VOUCHER CONTROL</h1>
              <p className="admin-header-subtitle">{vouchers.length} vouchers · {vouchers.filter(v => v.used).length} used</p>
            </div>
          </div>
        </div>

        <div className="admin-voucher-create">
          <div className="admin-voucher-row">
            <div className="admin-voucher-field">
              <label>Code (or leave blank to auto-generate)</label>
              <input value={newVoucher.code} onChange={e => setNewVoucher({ ...newVoucher, code: e.target.value.toUpperCase() })} placeholder="OMNI-XXXXXX" />
            </div>
            <div className="admin-voucher-field small">
              <label>Duration (days)</label>
              <input type="number" value={newVoucher.durationDays} onChange={e => setNewVoucher({ ...newVoucher, durationDays: Number(e.target.value) })} />
            </div>
          </div>
          <div className="admin-voucher-bulk">
            <button onClick={createSingle} className="admin-submit-btn small"><Plus size={14} /> CREATE SINGLE</button>
            <div className="admin-bulk-wrap">
              <input type="number" value={bulkCount} onChange={e => setBulkCount(Number(e.target.value))} className="admin-bulk-input" />
              <button onClick={createBulk} disabled={generating} className="admin-submit-btn small">
                {generating ? "GENERATING..." : <>⚡ GENERATE {bulkCount}</>}
              </button>
            </div>
          </div>
        </div>

        <div className="admin-voucher-list">
          {vouchers.map(v => (
            <div key={v._id} className="admin-voucher-item">
              <div className="admin-voucher-code">
                <Ticket size={14} />
                <span>{v.code}</span>
              </div>
              <div className="admin-voucher-meta">
                <span>{v.durationDays} days</span>
                <span className={v.used ? "used" : "available"}>{v.used ? `Used by ${v.usedBy?.name || "user"}` : "AVAILABLE"}</span>
              </div>
              <button onClick={() => copyCode(v.code)} className="admin-icon-btn">
                {copied === v.code ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminVouchers;
