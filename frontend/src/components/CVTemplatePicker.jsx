import React from "react";
import { X, ArrowLeft, Sparkles } from "lucide-react";

// Placeholder templates (replace URLs with Upstash images later)
const TEMPLATES = [
  { id: "modern", name: "Modern", color: "#6366f1", image: "https://placehold.co/200x260/6366f1/fff?text=Modern" },
  { id: "classic", name: "Classic", color: "#0ea5e9", image: "https://placehold.co/200x260/0ea5e9/fff?text=Classic" },
  { id: "creative", name: "Creative", color: "#f59e0b", image: "https://placehold.co/200x260/f59e0b/fff?text=Creative" },
  { id: "executive", name: "Executive", color: "#10b981", image: "https://placehold.co/200x260/10b981/fff?text=Executive" },
  { id: "minimal", name: "Minimal", color: "#64748b", image: "https://placehold.co/200x260/64748b/fff?text=Minimal" },
  { id: "bold", name: "Bold", color: "#ef4444", image: "https://placehold.co/200x260/ef4444/fff?text=Bold" },
];

export default function CVTemplatePicker({ onClose, onSelect }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="cv-picker-panel" onClick={e => e.stopPropagation()}>
        <div className="cv-picker-header">
          <button className="cv-picker-back" onClick={onClose}>
            <ArrowLeft size={18} />
          </button>
          <div className="cv-picker-title">Choose a Template</div>
          <button className="cv-picker-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="cv-picker-sub">
          <Sparkles size={13} /> Which style fits your next job?
        </div>

        <div className="cv-picker-grid">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              className="cv-template-card"
              onClick={() => onSelect(t)}
            >
              <img src={t.image} alt={t.name} className="cv-template-img" />
              <div className="cv-template-name">{t.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
