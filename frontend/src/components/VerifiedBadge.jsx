import React from "react";
import "./VerifiedBadge.css";

export default function VerifiedBadge({
  size = "md",
  label = "Verified Omnixra AI",
  showTooltip = true,
  className = "",
}) {
  const sizes = {
    xs: { wrapper: "h-3.5 w-3.5", svg: "h-3.5 w-3.5", stroke: 2.2 },
    sm: { wrapper: "h-4 w-4", svg: "h-4 w-4", stroke: 2.1 },
    md: { wrapper: "h-[18px] w-[18px]", svg: "h-[18px] w-[18px]", stroke: 2 },
    lg: { wrapper: "h-5 w-5", svg: "h-5 w-5", stroke: 1.9 },
    xl: { wrapper: "h-6 w-6", svg: "h-6 w-6", stroke: 1.8 },
  };

  const currentSize = sizes[size] || sizes.md;

  return (
    <span
      className={`omnixra-verified relative inline-flex shrink-0 items-center justify-center ${currentSize.wrapper} ${className}`}
      role="img"
      aria-label={label}
      data-tooltip={showTooltip ? label : undefined}
    >
      <svg className={`${currentSize.svg} omnixra-verified-svg`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10.25" fill="currentColor" />
        <path d="M7.4 12.25L10.35 15.15L16.65 8.85" stroke="white" strokeWidth={currentSize.stroke} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
