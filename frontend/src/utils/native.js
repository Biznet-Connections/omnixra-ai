// Centralized native (Capacitor) detection and helpers
// IMPORTANT: Import paths use variables so Vite ignores them in web builds

export const isNative = typeof window !== "undefined" && (
  window.Capacitor?.isNativePlatform?.() ||
  window.location.protocol === "capacitor:" ||
  window.location.protocol === "file:"
);

export const getPlatform = () => {
  return window.Capacitor?.getPlatform?.() || "web";
};

// Dynamic import helper — bypasses Vite static analysis
async function loadPlugin(pluginName) {
  // Use variable so Vite can't statically resolve
  const path = pluginName;
  return await import(/* @vite-ignore */ path);
}

export async function setupNativeUX() {
  if (!isNative) {
    console.log("🌐 Web mode — skipping native setup");
    return;
  }

  // StatusBar
  try {
    const mod = await loadPlugin("@capacitor/status-bar");
    const { StatusBar, Style } = mod;
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#06070b" });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (e) { console.log("StatusBar not available:", e.message); }

  // SplashScreen
  try {
    const mod = await loadPlugin("@capacitor/splash-screen");
    const { SplashScreen } = mod;
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch (e) { console.log("SplashScreen not available:", e.message); }

  // Keyboard
  try {
    const mod = await loadPlugin("@capacitor/keyboard");
    const { Keyboard } = mod;
    Keyboard.addListener("keyboardWillShow", (info) => {
      document.body.style.paddingBottom = `${info.keyboardHeight}px`;
    });
    Keyboard.addListener("keyboardWillHide", () => {
      document.body.style.paddingBottom = "0px";
    });
  } catch (e) { console.log("Keyboard not available:", e.message); }

  // App (back button)
  try {
    const mod = await loadPlugin("@capacitor/app");
    const { App: CapApp } = mod;
    CapApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    });
  } catch (e) { console.log("App plugin not available:", e.message); }

  console.log("📱 Native UX setup complete:", getPlatform());
}

export async function hapticLight() {
  if (!isNative) return;
  try {
    const mod = await loadPlugin("@capacitor/haptics");
    const { Haptics, ImpactStyle } = mod;
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (e) { /* ignore */ }
}

export async function hapticMedium() {
  if (!isNative) return;
  try {
    const mod = await loadPlugin("@capacitor/haptics");
    const { Haptics, ImpactStyle } = mod;
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch (e) { /* ignore */ }
}
