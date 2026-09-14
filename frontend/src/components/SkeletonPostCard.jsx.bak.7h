import React from "react";

// LinkedIn-style skeleton card.
// variant: "text" | "image" | "video"
function SkeletonPostCard({ variant = "text" }) {
  const shimmer = {
    background: "linear-gradient(90deg, #1e1e2e 0%, #2f2f45 50%, #1e1e2e 100%)",
    backgroundSize: "200% 100%",
    animation: "skeleton-shimmer 1.4s ease-in-out infinite",
    borderRadius: 6,
  };

  return (
    <article className="post-card skeleton-card" aria-hidden="true" style={{ pointerEvents: "none" }}>
      {/* Header: avatar + name lines */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ ...shimmer, width: 44, height: 44, borderRadius: "50%", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
          <div style={{ ...shimmer, height: 13, width: "42%", marginBottom: 8 }} />
          <div style={{ ...shimmer, height: 9, width: "28%", opacity: 0.6 }} />
        </div>
      </div>

      {/* Body text lines */}
      <div style={{ marginTop: 16 }}>
        <div style={{ ...shimmer, height: 10, width: "94%", marginBottom: 10 }} />
        <div style={{ ...shimmer, height: 10, width: "78%", marginBottom: 10 }} />
        {variant === "text" && (
          <div style={{ ...shimmer, height: 10, width: "56%", marginBottom: 10 }} />
        )}
      </div>

      {/* Media placeholder (image or video) */}
      {variant === "image" && (
        <div
          style={{
            ...shimmer,
            marginTop: 16,
            width: "100%",
            height: 220,
            borderRadius: 12,
          }}
        />
      )}
      {variant === "video" && (
        <div
          style={{
            ...shimmer,
            marginTop: 16,
            width: "100%",
            aspectRatio: "16/9",
            borderRadius: 12,
            position: "relative",
          }}
        >
          {/* play icon circle */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
              border: "2px solid rgba(255,255,255,0.15)",
            }}
          />
        </div>
      )}

      {/* Action bar */}
      <div style={{ display: "flex", gap: 24, marginTop: 18 }}>
        <div style={{ ...shimmer, height: 16, width: 32, opacity: 0.4 }} />
        <div style={{ ...shimmer, height: 16, width: 32, opacity: 0.4 }} />
        <div style={{ ...shimmer, height: 16, width: 32, opacity: 0.4 }} />
        <div style={{ ...shimmer, height: 16, width: 32, opacity: 0.4 }} />
      </div>
    </article>
  );
}

export default SkeletonPostCard;
