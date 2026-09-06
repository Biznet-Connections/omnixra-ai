import React, { useEffect, useState } from "react";
import CompanyCard from "../components/CompanyCard";
import api from "../api/axios";
import LoadingDots from "../components/LoadingDots";

function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/companies")
      .then(res => { setCompanies(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="page-scroll">
      <div className="page-container">
        <h1 className="page-title">Discover companies</h1>
        <p className="page-subtitle">Explore employers in Zimbabwe and beyond.</p>
        {loading ? (
          <div className="flex justify-center mt-10"><LoadingDots /></div>
        ) : companies.length === 0 ? (
          <div className="empty-state mt-7"><div className="empty-icon">🏢</div><h2 className="text-sm font-semibold mt-4">No companies yet</h2></div>
        ) : (
          <div className="company-grid mt-7">{companies.map(company => <CompanyCard key={company._id} company={company} />)}</div>
        )}
      </div>
    </div>
  );
}
export default CompaniesPage;
