// Strict pull-to-refresh: only enabled when (a) Home is mounted AND (b) scroll is at top.
// Updates native setPullEnabled on every scroll tick.
import { useEffect } from "react";

export function usePullToRefresh(enabled = true) {
  useEffect(() => {
    const native = window.OmnixraNative;
    if (!native?.setPullEnabled) return;

    // If disabled or missing native, ensure pull is off
    if (!enabled) {
      native.setPullEnabled(false);
      return;
    }

    // We wait for the scroll container to exist
    let scroller = null;
    let rafId = null;
    let lastState = null;

    const setIfChanged = (atTop) => {
      if (atTop === lastState) return;
      lastState = atTop;
      try {
        native.setPullEnabled(atTop);
      } catch (e) { /* native might not be ready */ }
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!scroller) return;
        setIfChanged(scroller.scrollTop <= 0);
      });
    };

    // Try to find the scroller (may not exist yet on first mount)
    let retries = 0;
    const tryAttach = () => {
      const el = document.querySelector(".page-scroll");
      if (el) {
        scroller = el;
        scroller.addEventListener("scroll", onScroll, { passive: true });
        // Initial state
        setIfChanged(scroller.scrollTop <= 0);
        console.log("🔄 [PTR] Attached to .page-scroll");
      } else if (retries < 30) {
        retries++;
        setTimeout(tryAttach, 100);
      } else {
        console.warn("🔄 [PTR] Could not find .page-scroll after 3s");
      }
    };
    tryAttach();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (scroller) scroller.removeEventListener("scroll", onScroll);
      // On unmount (leaving Home), disable pull
      try { native.setPullEnabled(false); } catch (e) { }
      console.log("🔄 [PTR] Detached + disabled");
    };
  }, [enabled]);
}
