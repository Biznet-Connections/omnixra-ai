import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import api from "../api/axios";

function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, jobs: 0, vouchers: 0, companies: 0 });
  const [vouchers, setVouchers] = useState([]);
  const [newVoucher, setNewVoucher] = useState({ code: "", durationDays: 30 });

  useEffect(() => {
    api.get("/admin/stats").then(res => setStats(res.data)).catch(() => {});
    api.get("/admin/vouchers").then(res => setVouchers(res.data)).catch(() => {});
  }, []);

  const createVoucher = async () => {
    try {
      const res = await api.post("/admin/vouchers", newVoucher);
      setVouchers([res.data, ...vouchers]);
      setNewVoucher({ code: "", durationDays: 30 });
    } catch (err) {
      alert(err.response?.data?.message || "Error creating voucher");
    }
  };

  return (
    <div className="page-scroll">
      <div className="page-container">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Manage Omnixra-AI.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-7">
          <div className="stat-card"><div className="text-xs text-slate-600">Users</div><div className="text-2xl font-bold mt-2">{stats.users}</div></div>
          <div className="stat-card"><div className="text-xs text-slate-600">Jobs</div><div className="text-2xl font-bold mt-2">{stats.jobs}</div></div>
          <div className="stat-card"><div className="text-xs text-slate-600">Vouchers</div><div className="text-2xl font-bold mt-2">{stats.vouchers}</div></div>
          <div className="stat-card"><div className="text-xs text-slate-600">Companies</div><div className="text-2xl font-bold mt-2">{stats.companies}</div></div>
        </div>

        <div className="form-card mt-7">
          <h2 className="text-sm font-semibold mb-5">Create Voucher</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">Voucher code</label>
              <input
                value={newVoucher.code}
                onChange={e => setNewVoucher({ ...newVoucher, code: e.target.value })}
                className="form-input"
                placeholder="ABC123"
              />
            </div>
            <div>
              <label className="form-label">Duration (days)</label>
              <input
                type="number"
                value={newVoucher.durationDays}
                onChange={e => setNewVoucher({ ...newVoucher, durationDays: Number(e.target.value) })}
                className="form-input"
                placeholder="30"
              />
            </div>
          </div>
          <button onClick={createVoucher} className="primary-button mt-4">
            <Plus size={14} />Create Voucher
          </button>
        </div>

        <div className="table-card mt-7">
          <div className="table-header">Voucher List</div>
          <div className="divide-y divide-white/[.04]">
            {vouchers.map(voucher => (
              <div key={voucher._id} className="application-row">
                <div className="flex-1">
                  <div className="text-sm font-mono">{voucher.code}</div>
                  <div className="text-[10px] text-slate-700 mt-1">
                    {voucher.durationDays} days · {new Date(voucher.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className={`text-xs font-medium ${voucher.used ? "text-red-400" : "text-emerald-400"}`}>
                  {voucher.used ? `Used by: ${voucher.usedBy?.email || "user"}` : "Unused"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
