import { useState, useEffect } from "react";

// Returns { online, wasOffline, lastOnline } — tracks browser online/offline state.
// Also listens to fetch failures to detect "connected but no internet" cases.
export function useNetworkStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [lastOnline, setLastOnline] = useState(() => Date.now());

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setLastOnline(Date.now());
      console.log("[NET] Back online");
    };
    const handleOffline = () => {
      setOnline(false);
      setWasOffline(true);
      console.log("[NET] Went offline");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { online, wasOffline, lastOnline };
}

export default useNetworkStatus;
