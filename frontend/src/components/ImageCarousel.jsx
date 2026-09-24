import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function ImageCarousel({ images, startIndex = 0, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const total = images?.length || 0;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose && onClose();
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIdx((i) => Math.min(total - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total, onClose]);

  // Touch swipe
  useEffect(() => {
    let startX = 0;
    const stage = document.querySelector(".image-carousel-stage");
    if (!stage) return;
    const onStart = (e) => { startX = e.touches[0].clientX; };
    const onEnd = (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) < 40) return;
      if (dx > 0) setIdx((i) => Math.max(0, i - 1));
      else setIdx((i) => Math.min(total - 1, i + 1));
    };
    stage.addEventListener("touchstart", onStart, { passive: true });
    stage.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      stage.removeEventListener("touchstart", onStart);
      stage.removeEventListener("touchend", onEnd);
    };
  }, [total]);

  if (!images || images.length === 0) return null;

  return (
    <div className="image-carousel-backdrop" onClick={onClose}>
      <div className="image-carousel-header">
        <span className="image-carousel-counter">{idx + 1} / {total}</span>
        <button className="image-carousel-close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
      </div>
      <div className="image-carousel-stage" onClick={(e) => e.stopPropagation()}>
        <img src={images[idx]} alt={`image-${idx}`} />
        {idx > 0 && (
          <button className="image-carousel-nav prev" onClick={() => setIdx((i) => i - 1)} aria-label="Previous">‹</button>
        )}
        {idx < total - 1 && (
          <button className="image-carousel-nav next" onClick={() => setIdx((i) => i + 1)} aria-label="Next">›</button>
        )}
        {total > 1 && (
          <div className="image-carousel-dots">
            {images.map((_, i) => (
              <div key={i} className={`image-carousel-dot ${i === idx ? "active" : ""}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
