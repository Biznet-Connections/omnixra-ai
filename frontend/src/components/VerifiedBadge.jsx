import React from "react";
import "./VerifiedBadge.css";

const SIZES = {
  xs: 12,
  sm: 14,
  md: 18,
  lg: 22,
  xl: 28,
};

const COLORS = {
  blue: "#1DA1F2",      // verified company / user (default)
  purple: "#a855f7",    // Omnixra AI
  gold: "#FFC107",      // premium (future)
  green: "#25D366",     // WhatsApp business style (future)
};

export default function VerifiedBadge({
  size = "md",
  color = "blue",
  label = "Verified",
  showTooltip = true,
  className = "",
}) {
  const px = SIZES[size] || SIZES.md;
  const fill = COLORS[color] || COLORS.blue;

  return (
    <span
      className={`omnixra-verified relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: px, height: px }}
      role="img"
      aria-label={label}
      data-tooltip={showTooltip ? label : undefined}
      title={showTooltip ? label : undefined}
    >
      <svg
        viewBox="0 0 24 24"
        width={px}
        height={px}
        fill={fill}
        aria-hidden="true"
        className="omnixra-verified-svg"
      >
        {/* Twitter/X-style rosette with 8 scallops + white check */}
        <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
      </svg>
    </span>
  );
}
