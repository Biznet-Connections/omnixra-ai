import React from "react";
import { ArrowLeft } from "lucide-react";
import CompanyHome from "../components/CompanyHome";

export default function CompanyDashboardPage({ setPage }) {
  return (
    <div className="page-scroll">
      <div className="page-container">
        <button onClick={() => setPage("home")} className="text-slate-600 hover:text-white flex items-center gap-2 mb-5">
          <ArrowLeft size={16} /> Back
        </button>
        <CompanyHome setPage={setPage} />
      </div>
    </div>
  );
}
