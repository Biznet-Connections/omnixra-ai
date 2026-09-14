import React from "react";

// LinkedIn-style skeleton with Omnixra purple-tinted shimmer.
// variant: "text" | "image" | "video"
function SkeletonPostCard({ variant = "text" }) {
  const shimmer = {
    background: "linear-gradient(90deg, #1a1a2e 0%, #2d2a4a 25%, #3a2f5a 50%, #2d2a4a 75%, #1a1a2e 100%)",
    backgroundSize: "200% 100%",
    animation: "skeleton-shimmer 1.6s ease-in-out infinite",
    borderRadius: 6,
  };

  return (
    <article
      className="post-card skeleton-card"
      aria-hidden="true"
      style={{ pointerEvents: "none", overflow: "hidden" }}
    >
      {/* Header */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ ...shimmer, width: 44, height: 44, borderRadius: "50%", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
          <div style={{ ...shimmer, height: 13, width: "38%", marginBottom: 8 }} />
          <div style={{ ...shimmer, height: 9, width: "26%", opacity: 0.55 }} />
        </div>
      </div>

      {/* Body text */}
      <div style={{ marginTop: 18 }}>
        <div style={{ ...shimmer, height: 11, width: "92%", marginBottom: 10 }} />
        <div style={{ ...shimmer, height: 11, width: "76%", marginBottom: 10 }} />
        {variant === "text" && (
          <div style={{ ...shimmer, height: 11, width: "52%", marginBottom: 10 }} />
        )}
      </div>

      {/* Image placeholder */}
      {variant === "image" && (
        <div
          style={{
            ...shimmer,
            marginTop: 16,
            width: "100%",
            height: 240,
            borderRadius: 12,
          }}
        />
      )}

      {/* Video placeholder with pulsing play button */}
      {variant === "video" && (
        <div
          style={{
            ...shimmer,
            marginTop: 16,
            width: "100%",
            aspectRatio: "16 / 9",
            borderRadius: 12,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(139, 92, 246, 0.18)",
              border: "2px solid rgba(139, 92, 246, 0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "skeleton-pulse 1.8s ease-in-out infinite",
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: "14px solid rgba(139, 92, 246, 0.9)",
                borderTop: "9px solid transparent",
                borderBottom: "9px solid transparent",
                marginLeft: 4,
              }}
            />
          </div>
        </div>
      )}

      {/* Action bar */}
      <div
        style={{
          display: "flex",
          gap: 28,
          marginTop: 20,
          paddingTop: 14,
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ ...shimmer, height: 16, width: 30, opacity: 0.35, borderRadius: 4 }} />
        <div style={{ ...shimmer, height: 16, width: 30, opacity: 0.35, borderRadius: 4 }} />
        <div style={{ ...shimmer, height: 16, width: 30, opacity: 0.35, borderRadius: 4 }} />
        <div style={{ ...shimmer, height: 16, width: 30, opacity: 0.35, borderRadius: 4 }} />
      </div>
    </article>
  );
}

export default SkeletonPostCard;
