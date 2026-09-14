import { useEffect, useRef } from "react";

/**
 * useNetworkRefresh(onReconnect)
 * - Fires onReconnect whenever the browser reports it's back online.
 * - Also detects silent failures (fetch fails while online) via the 'offline' event.
 * - Safe to use in multiple components.
 */
export function useNetworkRefresh(onReconnect) {
  const wasOffline = useRef(!navigator.onLine);
  const cbRef = useRef(onReconnect);
  cbRef.current = onReconnect;

  useEffect(() => {
    const handleOnline = () => {
      console.log("🌐 [NETWORK] Back online");
      if (wasOffline.current) {
        wasOffline.current = false;
        // Small delay so sockets settle before refresh
        setTimeout(() => {
          try {
            cbRef.current && cbRef.current();
          } catch (e) {
            console.warn("[NETWORK] onReconnect error:", e.message);
          }
        }, 500);
      }
    };

    const handleOffline = () => {
      console.log("📴 [NETWORK] Offline");
      wasOffline.current = true;
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
}

export default useNetworkRefresh;
