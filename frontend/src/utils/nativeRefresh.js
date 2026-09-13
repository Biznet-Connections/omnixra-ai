// Bridges native Android SwipeRefreshLayout → React refreshPosts()
// Native sends "native-refresh" event → we call the handler → we tell native to stop

let refreshHandler = null;

export function setNativeRefreshHandler(handler) {
  refreshHandler = handler;
}

if (typeof window !== "undefined") {
  window.addEventListener("native-refresh", async () => {
    console.log("🔄 [NATIVE REFRESH] triggered");
    try {
      if (refreshHandler) await refreshHandler();
    } catch (e) {
      console.warn("Native refresh error:", e);
    } finally {
      // Tell native to hide the spinner
      window.dispatchEvent(new CustomEvent("native-refresh-done"));
      console.log("🔄 [NATIVE REFRESH] done");
    }
  });
}
