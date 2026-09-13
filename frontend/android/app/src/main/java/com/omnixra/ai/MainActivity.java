package com.omnixra.ai;

import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.FrameLayout;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;

public class MainActivity extends BridgeActivity {
    private SwipeRefreshLayout swipeRefresh;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Disable autofill on WebView
        try {
            Bridge bridge = getBridge();
            if (bridge != null) {
                WebView webView = bridge.getWebView();
                if (webView != null) {
                    webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
                }
            }
        } catch (Exception e) { }

        // Wrap WebView in SwipeRefreshLayout
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

                    swipeRefresh.addView(webView, new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    ));

                    parent.addView(swipeRefresh, webViewIndex, new ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    ));

                    // CRITICAL: Only allow pull when WebView is scrolled to top
                    swipeRefresh.setEnabled(true);
                    swipeRefresh.setOnChildScrollUpCallback((parentView, child) -> {
                        // Return true when we should DISABLE refresh (not at top)
                        // Return false when we should ALLOW refresh (at top)
                        final boolean[] shouldDisable = { false };
                        // We need this synchronously — use canScrollVertically on WebView
                        return webView.canScrollVertically(-1);
                    });

                    // Refresh trigger
                    swipeRefresh.setOnRefreshListener(() -> {
                        webView.evaluateJavascript(
                            "window.dispatchEvent(new CustomEvent('native-refresh'));",
                            null
                        );
                    });

                    // Expose native functions to JS
                    webView.addJavascriptInterface(new Object() {
                        @android.webkit.JavascriptInterface
                        public void stopRefresh() {
                            runOnUiThread(() -> {
                                if (swipeRefresh != null) swipeRefresh.setRefreshing(false);
                            });
                        }
                    }, "OmnixraNative");

                    // Wire up done event
                    webView.post(() -> webView.evaluateJavascript(
                        "window.addEventListener('native-refresh-done', () => { if (window.OmnixraNative) window.OmnixraNative.stopRefresh(); });",
                        null
                    ));
                }
            }
        } catch (Exception e) { }
    }
}
