import React, { useState } from "react";
import { FileText, Sparkles, Upload } from "lucide-react";

function CVPage() {
  const [uploaded, setUploaded] = useState(false);

  return (
    <div className="page-scroll">
      <div className="page-container">
        <h1 className="page-title">Create CV</h1>
        <p className="page-subtitle">Your CV powers Omnixra's matching intelligence.</p>

        <div className="cv-layout mt-7">
          <div className="cv-card">
            {uploaded ? (
              <>
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="cv-icon"><FileText size={21} /></div>
                    <div>
                      <div className="text-sm font-semibold">My_Professional_CV.pdf</div>
                      <div className="text-[10px] text-slate-700 mt-1">Uploaded recently</div>
                    </div>
                  </div>
                </div>
                <div className="mt-7">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">AI CV score</span>
                    <span className="text-indigo-300 font-semibold">86/100</span>
                  </div>
                  <div className="match-progress mt-2"><div style={{ width: "86%" }} /></div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Upload size={30} className="mx-auto text-slate-600" />
                <div className="text-sm font-semibold mt-4">Upload your CV</div>
                <div className="text-xs text-slate-600 mt-2">PDF, DOCX or TXT · Max 5MB</div>
                <button className="primary-button mt-5 mx-auto" onClick={() => setUploaded(true)}>
                  Upload CV
                </button>
              </div>
            )}
          </div>

          <div className="ai-feature-card">
            <div className="ai-feature-icon"><Sparkles size={18} /></div>
            <h3 className="font-semibold mt-4">Optimise with Omnixra</h3>
            <p className="text-xs text-slate-600 leading-6 mt-2">
              Analyse your CV against real opportunities and receive AI recommendations.
            </p>
            <button className="primary-button w-full mt-5">
              Analyse my CV
              <Sparkles size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CVPage;
