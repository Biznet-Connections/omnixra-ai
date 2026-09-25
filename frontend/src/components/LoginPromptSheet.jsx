import React, { useEffect } from "react";
import { X } from "lucide-react";

export default function LoginPromptSheet({ prompt, onClose, onOpenAuth }) {
  useEffect(() => {
    if (!prompt) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [prompt]);

  if (!prompt) return null;

  const { copy, meta, action } = prompt;

  return (
    <div className="login-prompt-backdrop" onClick={onClose}>
      <div className="login-prompt-sheet" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="login-prompt-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <div className="login-prompt-icon">{copy.icon}</div>
        <h2 className="login-prompt-title">
          {copy.title}
          {meta?.name && action === "follow" ? ` ${meta.name}` : ""}
        </h2>
        {(meta?.jobTitle || meta?.company) && action === "apply" && (
          <div className="login-prompt-context">
            {meta.jobTitle && <div className="login-prompt-context-line">▸ {meta.jobTitle}</div>}
            {meta.company && <div className="login-prompt-context-line">▸ {meta.company}</div>}
          </div>
        )}
        {copy.subtitle && <p className="login-prompt-sub">{copy.subtitle}</p>}
        {copy.bullets && (
          <ul className="login-prompt-bullets">
            {copy.bullets.map((b, i) => (
              <li key={i}><span className="login-prompt-check">✓</span>{b}</li>
            ))}
          </ul>
        )}
        <button type="button" className="login-prompt-primary" onClick={() => { onClose && onClose(); onOpenAuth && onOpenAuth("signup"); }}>
          Sign up with email
        </button>
        <button type="button" className="login-prompt-secondary" onClick={() => { onClose && onClose(); onOpenAuth && onOpenAuth("signin"); }}>
          Already have an account? Sign in
        </button>
        <button type="button" className="login-prompt-tertiary" onClick={onClose}>
          Not now
        </button>
      </div>
    </div>
  );
}
