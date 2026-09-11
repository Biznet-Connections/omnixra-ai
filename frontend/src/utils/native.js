// Centralized native (Capacitor) detection and helpers

export const isNative = typeof window !== "undefined" && (
  window.Capacitor?.isNativePlatform?.() ||
  window.location.protocol === "capacitor:" ||
  window.location.protocol === "file:"
);

export const getPlatform = () => {
  return window.Capacitor?.getPlatform?.() || "web";
};

// Setup native UX (status bar, splash, keyboard, etc.)
export async function setupNativeUX() {
  if (!isNative) return;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#06070b" });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (e) { console.log("StatusBar not available:", e.message); }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch (e) { console.log("SplashScreen not available:", e.message); }

  try {
    const { Keyboard } = await import("@capacitor/keyboard");
    Keyboard.addListener("keyboardWillShow", (info) => {
      document.body.style.paddingBottom = `${info.keyboardHeight}px`;
    });
    Keyboard.addListener("keyboardWillHide", () => {
      document.body.style.paddingBottom = "0px";
    });
  } catch (e) { console.log("Keyboard not available:", e.message); }

  try {
    const { App: CapApp } = await import("@capacitor/app");
    CapApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    });
  } catch (e) { console.log("App not available:", e.message); }

  console.log("📱 Native UX setup complete:", getPlatform());
}

// Haptic feedback
export async function hapticLight() {
  if (!isNative) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (e) { /* ignore */ }
}

export async function hapticMedium() {
  if (!isNative) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch (e) { /* ignore */ }
}
