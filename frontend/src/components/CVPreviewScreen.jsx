import React, { useState } from "react";
import { ArrowLeft, Sparkles, Download, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function CVPreviewScreen({ template, onBack, onDownload }) {
  const { user } = useAuth();
  const [polishing, setPolishing] = useState(false);

  // Placeholder data — will be pulled from user profile
  const name = user?.name || "Your Name";
  const headline = user?.category || "Professional";
  const location = user?.location || "Harare, Zimbabwe";
  const experience = user?.experience || [
    "5 years of experience in telecommunications and network engineering",
    "Installation, maintenance, and troubleshooting of infrastructure",
    "Working at height on rigging projects",
  ];
  const skills = user?.skills || [
    "Rigging", "Network Engineering", "Troubleshooting", "Team Leadership",
  ];

  const handlePolish = async () => {
    setPolishing(true);
    // AI polish — will hook into /ai/polish-cv later
    await new Promise(r => setTimeout(r, 1400));
    setPolishing(false);
  };

  return (
    <div className="modal-backdrop" onClick={onBack}>
      <div className="cv-preview-panel" onClick={e => e.stopPropagation()}>
        <div className="cv-preview-header">
          <button className="cv-picker-back" onClick={onBack}>
            <ArrowLeft size={18} />
          </button>
          <div className="cv-picker-title">{template.name} Template</div>
          <div style={{ width: 30 }} />
        </div>

        <div className="cv-preview-scroll">
          <div
            className="cv-paper"
            style={{ borderTopColor: template.color }}
          >
            <div className="cv-name" style={{ color: template.color }}>{name}</div>
            <div className="cv-headline">{headline} · {location}</div>
            <div className="cv-divider" style={{ background: template.color }} />

            <div className="cv-section">
              <div className="cv-section-title" style={{ color: template.color }}>EXPERIENCE</div>
              {experience.map((e, i) => (
                <div key={i} className="cv-item">• {e}</div>
              ))}
            </div>

            <div className="cv-section">
              <div className="cv-section-title" style={{ color: template.color }}>SKILLS</div>
              <div className="cv-item">• {skills.join(" · ")}</div>
            </div>
          </div>

          <button
            className="cv-polish-btn"
            onClick={handlePolish}
            disabled={polishing}
          >
            {polishing ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
            {polishing ? "Polishing with AI…" : "AI Polish my CV"}
          </button>
        </div>

        <div className="cv-preview-footer">
          <button className="primary-button w-full justify-center" onClick={onDownload}>
            <Download size={15} /> Save & Download
          </button>
        </div>
      </div>
    </div>
  );
}
