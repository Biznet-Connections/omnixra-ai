// Enables native pull-to-refresh ONLY when mounted
// Called by HomePage on mount, disabled on unmount.
import { useEffect } from "react";

export function usePullToRefresh(enabled = true) {
  useEffect(() => {
    const native = window.OmnixraNative;
    if (!native?.setPullEnabled) return;

    if (enabled) {
      native.setPullEnabled(true);
      console.log("🔄 [PTR] Enabled");
    }

    return () => {
      if (enabled && native?.setPullEnabled) {
        native.setPullEnabled(false);
        console.log("🔄 [PTR] Disabled");
      }
    };
  }, [enabled]);
}
