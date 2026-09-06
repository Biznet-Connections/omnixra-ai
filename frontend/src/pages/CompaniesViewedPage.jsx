import React, { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import api from "../api/axios";
function CompaniesViewedPage({ setPage }) {
  const [companies, setCompanies] = useState([]);
  useEffect(() => { api.get("/profile/views").then(res => setCompanies(res.data.companyViews || [])); }, []);
  return (
    <div className="page-scroll"><div className="page-container">
      <button onClick={() => setPage("home")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5"><ArrowLeft size={16} /> Back</button>
      <h1 className="page-title">Companies Viewed</h1><p className="page-subtitle">Companies that viewed your profile</p>
      {companies.length === 0 ? <div className="empty-state mt-7"><div className="empty-icon">🏢</div><h2 className="text-sm font-semibold mt-4">No company views yet</h2></div> :
        <div className="space-y-3 mt-7">{companies.map((c, i) => <div key={i} className="talent-card flex items-center gap-3"><div className="company-logo bg-gradient-to-br from-indigo-500 to-blue-600">{c.company?.name?.[0]}</div><div><div className="font-semibold text-sm">{c.company?.name}</div><div className="text-[10px] text-slate-600">{new Date(c.viewedAt).toLocaleString()}</div></div></div>)}</div>}
    </div></div>
  );
}
export default CompaniesViewedPage;
