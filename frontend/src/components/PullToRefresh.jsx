import React, { useRef, useState, useEffect } from "react";

const THRESHOLD = 80;
const MAX_PULL = 130;

function PullToRefresh({ onRefresh, children }) {
  const startY = useRef(0);
  const pulling = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [ready, setReady] = useState(false);

  // Wait for the .page-scroll container to exist
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const findScroller = () => {
      if (cancelled) return;
      const scroller = document.querySelector(".page-scroll");
      if (scroller) {
        console.log("🔽 [PTR] Scroller found");
        setReady(true);
      } else if (attempts < 20) {
        attempts++;
        setTimeout(findScroller, 100);
      } else {
        console.warn("🔽 [PTR] Scroller NOT found after 2s");
      }
    };
    findScroller();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const scroller = document.querySelector(".page-scroll");
    if (!scroller) return;

    console.log("🔽 [PTR] Attaching touch listeners to:", scroller.className);

    const onStart = (e) => {
      if (scroller.scrollTop <= 0 && !refreshing) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    };

    const onMove = (e) => {
      if (!pulling.current || refreshing) return;
      const dist = e.touches[0].clientY - startY.current;
      if (dist > 0 && scroller.scrollTop <= 0) {
        const damped = Math.min(dist * 0.5, MAX_PULL);
        setPullDistance(damped);
        // Prevent native scroll while pulling
        if (damped > 5 && e.cancelable) e.preventDefault();
      }
    };

    const onEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      const finalDist = pullDistance;
      if (finalDist >= THRESHOLD && !refreshing) {
        console.log("🔽 [PTR] Triggering refresh");
        setRefreshing(true);
        setPullDistance(THRESHOLD);
        try { await onRefresh(); } catch (e) { /* ignore */ }
        await new Promise(r => setTimeout(r, 400));
        setRefreshing(false);
      }
      setPullDistance(0);
    };

    scroller.addEventListener("touchstart", onStart, { passive: true });
    scroller.addEventListener("touchmove", onMove, { passive: false });
    scroller.addEventListener("touchend", onEnd);
    scroller.addEventListener("touchcancel", onEnd);

    return () => {
      scroller.removeEventListener("touchstart", onStart);
      scroller.removeEventListener("touchmove", onMove);
      scroller.removeEventListener("touchend", onEnd);
      scroller.removeEventListener("touchcancel", onEnd);
    };
  }, [ready, pullDistance, refreshing, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const isActive = pullDistance > 0 || refreshing;
  const containerHeight = refreshing ? THRESHOLD : pullDistance;

  return (
    <>
      <div
        className="ptr-wrap"
        style={{ height: isActive ? `${containerHeight}px` : 0 }}
      >
        <div className={`ptr-ring ${refreshing ? "ptr-ring-spinning" : ""}`}>
          <svg viewBox="0 0 36 36" width="28" height="28">
            <defs>
              <linearGradient id="ptrGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <circle
              cx="18" cy="18" r="14"
              fill="none"
              stroke="url(#ptrGradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${refreshing ? 88 : progress * 88} 88`}
              transform="rotate(-90 18 18)"
            />
          </svg>
        </div>
      </div>
      {children}
    </>
  );
}

export default PullToRefresh;
