package com.omnixra.ai;

import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.webkit.JavascriptInterface;
import android.widget.FrameLayout;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;

public class MainActivity extends BridgeActivity {
    private SwipeRefreshLayout swipeRefresh;
    private boolean atTop = true;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            Bridge bridge = getBridge();
            if (bridge != null) {
                WebView webView = bridge.getWebView();
                if (webView != null) {
                    webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
                }
            }
        } catch (Exception e) { }

        try {
            Bridge bridge = getBridge();
            if (bridge != null) {
                WebView webView = bridge.getWebView();
                if (webView != null && webView.getParent() instanceof ViewGroup) {
                    ViewGroup parent = (ViewGroup) webView.getParent();
                    int webViewIndex = parent.indexOfChild(webView);
                    parent.removeView(webView);

                    swipeRefresh = new SwipeRefreshLayout(this);
                    swipeRefresh.setColorSchemeColors(0xFF8B5CF6, 0xFF6366F1, 0xFFA855F7);
                    swipeRefresh.setProgressBackgroundColorSchemeColor(0xFF0F0F1E);
                    swipeRefresh.setDistanceToTriggerSync(220);
                    swipeRefresh.setEnabled(true);

                    swipeRefresh.addView(webView, new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    ));

                    parent.addView(swipeRefresh, webViewIndex, new ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    ));

                    // Only allow pull when JS says we're at top
                    swipeRefresh.setOnChildScrollUpCallback((p, child) -> !atTop);

                    swipeRefresh.setOnRefreshListener(() -> {
                        webView.evaluateJavascript(
                            "window.dispatchEvent(new CustomEvent('native-refresh'));",
                            null
                        );
                    });

                    // JS bridge: JS tells native whether we're at top
                    webView.addJavascriptInterface(new Object() {
                        @JavascriptInterface
                        public void setAtTop(boolean isTop) {
                            atTop = isTop;
                        }

                        @JavascriptInterface
                        public void stopRefresh() {
                            runOnUiThread(() -> {
                                if (swipeRefresh != null) swipeRefresh.setRefreshing(false);
                            });
                        }
                    }, "OmnixraNative");

                    // Hook done event
                    webView.post(() -> webView.evaluateJavascript(
                        "window.addEventListener('native-refresh-done', () => { if (window.OmnixraNative) window.OmnixraNative.stopRefresh(); });",
                        null
                    ));

                    // Monitor scroll position and tell native atTop status
                    webView.post(() -> webView.evaluateJavascript(
                        "(function() {" +
                        "  const scroller = document.querySelector('.page-scroll');" +
                        "  if (!scroller) { setTimeout(arguments.callee, 500); return; }" +
                        "  const update = () => {" +
                        "    const atTop = scroller.scrollTop <= 0;" +
                        "    if (window.OmnixraNative) window.OmnixraNative.setAtTop(atTop);" +
                        "  };" +
                        "  scroller.addEventListener('scroll', update, { passive: true });" +
                        "  update();" +
                        "})();",
                        null
                    ));
                }
            }
        } catch (Exception e) { }
    }
}
