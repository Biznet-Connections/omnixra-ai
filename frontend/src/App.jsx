import React, { useState, useEffect } from "react";
import LoadingScreen from "./components/LoadingScreen";
import ErrorBoundary from "./components/ErrorBoundary";
import AuthScreen from "./components/AuthScreen";
import BottomNav from "./components/BottomNav";
import DesktopSidebar from "./components/DesktopSidebar";
import HomePage from "./pages/HomePage";
import AuthCallback from "./pages/AuthCallback";
import VerifyEmailScreen from "./pages/VerifyEmailScreen";
import CompanySetupScreen from "./pages/CompanySetupScreen";
import ChatPage from "./pages/ChatPage";
import JobsPage from "./pages/JobsPage";
import CompaniesPage from "./pages/CompaniesPage";
import ProfessionalsPage from "./pages/ProfessionalsPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import MyPostsPage from "./pages/MyPostsPage";
import ManageJobsPage from "./pages/ManageJobsPage";
import EditProfilePage from "./pages/EditProfilePage";
import NewsPage from "./pages/NewsPage";
import MyNetworkPage from "./pages/MyNetworkPage";
import FollowingPage from "./pages/FollowingPage";
import UserProfilePage from "./pages/UserProfilePage";
import ProfileViewsPage from "./pages/ProfileViewsPage";
import CompaniesViewedPage from "./pages/CompaniesViewedPage";
import ProfileStatsPage from "./pages/ProfileStatsPage";
import SavedPostsPage from "./pages/SavedPostsPage";
import InboxPage from "./pages/InboxPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import SharedAIPage from "./pages/SharedAIPage";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminPostAI from "./pages/AdminPostAI";
import AdminUsers from "./pages/AdminUsers";
import AdminVouchers from "./pages/AdminVouchers";
import AdminModeration from "./pages/AdminModeration";
import AdminJobs from "./pages/AdminJobs";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminAnnouncements from "./pages/AdminAnnouncements";
import AdminSettings from "./pages/AdminSettings";
import PostComposer from "./components/PostComposer";
import { useAuth } from "./context/AuthContext";
import { PostsProvider } from "./context/PostsContext";
import { SocketProvider } from "./context/SocketContext";
import InAppNotificationBanner from "./components/InAppNotificationBanner";
import ExpiryBanner from "./components/ExpiryBanner";
import DiscoverPage from "./pages/DiscoverPage";
import PostJobPage from "./pages/PostJobPage";
import CompanyInboxPage from "./pages/CompanyInboxPage";
import CompanyPostsPage from "./pages/CompanyPostsPage";
import MyJobPostsPage from "./pages/MyJobPostsPage";
import CompanyDashboardPage from "./pages/CompanyDashboardPage";
import CompanyPricingPage from "./pages/CompanyPricingPage";
import TeamMembersPage from "./pages/TeamMembersPage";
import BillingPage from "./pages/BillingPage";
import ChangeEmailPage from "./pages/ChangeEmailPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import ChannelPage from "./pages/ChannelPage";
import PremiumPage from "./pages/PremiumPage";
import PaymentCompletePage from "./pages/PaymentCompletePage";

function AppContent() {
  // â”€â”€ ALL HOOKS AT THE TOP â”€â”€
  const [splashDone, setSplashDone] = useState(false);
  const [page, setPage] = useState(() => {
    if (typeof window === "undefined") return "home";
    const path = window.location.pathname;
    if (path.startsWith("/auth-callback")) return "auth-callback";
    if (path.startsWith("/admin-login")) return "admin-login";
    if (path.startsWith("/admin")) return "admin";
    if (path.startsWith("/shared-ai/")) return "shared-ai";
    if (path.startsWith("/job/")) return "jobs";
    if (path.startsWith("/premium")) return "premium";
    if (path.startsWith("/payment-complete")) return "payment-complete";
    return "home";
  });
  const [showPostComposer, setShowPostComposer] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [sharedChatId, setSharedChatId] = useState(null);
  const [focusPostId, setFocusPostId] = useState(null);
  const [focusJobSlug, setFocusJobSlug] = useState(null);
  const [channelSlug, setChannelSlug] = useState(null);
  const [history, setHistory] = useState([]);
  const { user, setUser, loading: authLoading, pendingVerification } = useAuth();

  // â”€â”€ Helper functions â”€â”€
  const navigate = (to) => {
    // Handle "channel:slug" navigation pattern
    if (typeof to === "string" && to.startsWith("channel:")) {
      const slug = to.split("channel:")[1];
      setChannelSlug(slug);
      setHistory(prev => [...prev, page]);
      setPage("channel");
      return;
    }
    setHistory(prev => [...prev, page]);
    setPage(to);
  };

  const goBack = () => {
    if (history.length > 0) {
      const prev = history.pop();
      setHistory([...history]);
      setPage(prev);
      return true;
    }
    return false;
  };

  // â”€â”€ ALL useEffects (in order) â”€â”€
  // â”€â”€ Listen for native OAuth deep-link token (from main.jsx) â”€â”€
  useEffect(() => {
    const handleOauthToken = async (event) => {
      const token = event.detail?.token;
      if (!token) return;
      try {
        const { default: api } = await import("./api/axios");
        const res = await api.get("/auth/me");
        localStorage.setItem("omnixra_user", JSON.stringify(res.data));
        window.dispatchEvent(new CustomEvent("auth-user-loaded", { detail: res.data }));
        setPage("home");
      } catch (e) {
        console.error("OAuth /auth/me failed:", e.message);
      }
    };
    window.addEventListener("oauth-token-received", handleOauthToken);
    return () => window.removeEventListener("oauth-token-received", handleOauthToken);
  }, []);

  // ── Capacitor deeplink handler (payment-success) ──
  useEffect(() => {
    let listener;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { App: CapApp } = await import("@capacitor/app");
        listener = await CapApp.addListener("appUrlOpen", async (event) => {
          const url = event.url || "";
          console.log("[deeplink] received:", url);
          // Handle both universal link (https://omnixra-ai.com/app/payment-success) and custom scheme
          const isUniversal = url.includes("/app/payment-success");
          const isCustom = url.startsWith("omnixra://payment-success");
          
          if (isUniversal || isCustom) {
            // Extract status param from deeplink
            let paymentStatus = "paid";
            try {
              const u = new URL(url.replace("omnixra://", "https://dummy/"));
              paymentStatus = u.searchParams.get("status") || "paid";
            } catch (e) {}

            // Always refresh user (in case payment succeeded)
            try {
              const { default: api } = await import("./api/axios");
              const res = await api.get("/auth/me");
              setUser(res.data);
              localStorage.setItem("omnixra_user", JSON.stringify(res.data));
              console.log("[deeplink] user refreshed:", res.data?.subscriptionTier, "| payment status:", paymentStatus);
            } catch (e) {
              console.warn("[deeplink] user refresh failed:", e.message);
            }

            // Navigate appropriately
            if (paymentStatus === "paid") {
              setPage("jobs");
            } else if (paymentStatus === "failed" || paymentStatus === "timeout") {
              // Return to where they were — Jobs or Premium
              setPage("jobs");
            }
          }
        });
      } catch (e) {
        console.warn("[deeplink] init failed:", e.message);
      }
    })();
    return () => {
      if (listener && listener.remove) listener.remove();
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (!goBack()) window.history.back();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [history]);


  // â”€â”€ Deep link: /post/{id} â†’ set focusPostId â”€â”€
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/post/")) {
      const postId = path.split("/post/")[1];
      if (postId) {
        setFocusPostId(postId);
        setPage("home");
        // Clean the URL so reloads don't re-trigger
        window.history.replaceState({}, "", "/");
      }
    }
  }, []);

  // Check URL for admin + shared links on mount
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/auth-callback")) {
      setPage("auth-callback");
    } else if (path.startsWith("/admin-login")) {
      setPage("admin-login");
    } else if (path.startsWith("/admin")) {
      setPage("admin");
    }
    if (path.startsWith("/shared-ai/")) {
      const chatId = path.split("/shared-ai/")[1];
      setSharedChatId(chatId);
      setPage("shared-ai");
    } else if (path.startsWith("/post/")) {
      const postId = path.split("/post/")[1];
      setFocusPostId(postId);
      setPage("home");
    } else if (path.startsWith("/job/")) {
      const slug = path.split("/job/")[1];
      setFocusJobSlug(slug);
      setPage("jobs");
    } else if (path.startsWith("/c/")) {
      const slug = path.split("/c/")[1];
      setChannelSlug(slug);
      setPage("channel");
    }
  }, []);

  // Redirect after sign-in
  useEffect(() => {
    if (user) {
      const redirect = localStorage.getItem("omnixra_redirect");
      if (redirect) {
        try {
          const redirectData = JSON.parse(redirect);
          if (redirectData.page) setPage(redirectData.page);
          if (redirectData.userId) setSelectedUserId(redirectData.userId);
          if (redirectData.chatId) setSharedChatId(redirectData.chatId);
          localStorage.removeItem("omnixra_redirect");
        } catch (e) {
          localStorage.removeItem("omnixra_redirect");
        }
      }
    }
  }, [user]);



  // â”€â”€ EARLY RETURNS (all hooks above this line) â”€â”€
  // Trigger native Android notification permission ONCE after sign-in
  useEffect(() => {
    return; // TEMP: disabled for debug
    if (!user) return;
    if (localStorage.getItem("omnixra_notif_prompted")) return;
    localStorage.setItem("omnixra_notif_prompted", "1");

    const t = setTimeout(async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const { Capacitor } = await import("@capacitor/core");
        if (Capacitor.isNativePlatform()) {
          const result = await PushNotifications.requestPermissions();
          console.log("🔔 Permission result:", result.receive);
          // register() waits for FCM setup — safe to enable later
        } else if ("Notification" in window) {
          await Notification.requestPermission();
        }
      } catch (e) {
        console.warn("Notif perm error:", e);
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [user]);

  const appReady = splashDone && !authLoading;
  if (!appReady) return <LoadingScreen onFinish={() => setSplashDone(true)} />;


  // Admin login path
  const path = window.location.pathname;
  const isAdminLoginPath = path.startsWith("/admin-login");
  if (!user && isAdminLoginPath) {
    return <AdminLogin onSuccess={() => setPage("admin")} />;
  }
  if (!user) return <AuthScreen />;

  // â”€â”€ Pending email verification â†’ show VerifyEmailScreen â”€â”€
  if (pendingVerification && !user) {
    return (
      <VerifyEmailScreen
        email={pendingVerification.email}
        setPage={setPage}
      />
    );
  }

  // â”€â”€ Company user without company name â†’ setup screen â”€â”€
  const needsCompanySetup =
    user &&
    user.accountType === "company" &&
    (!user.companyName || user.companyName.trim() === "");
  if (needsCompanySetup) {
    return <CompanySetupScreen setPage={setPage} />;
  }
  // â”€â”€ Main render helpers â”€â”€
  const renderPage = () => {
    switch (page) {
      case "home": return <HomePage setPage={navigate} setSelectedUserId={setSelectedUserId} focusPostId={focusPostId} />;
      case "discover": return <DiscoverPage setPage={navigate} setSelectedUserId={setSelectedUserId} />;
      case "channel": return <ChannelPage slug={channelSlug} setPage={navigate} />;
      case "premium": return <PremiumPage setPage={navigate} />;
      case "post-job": return <PostJobPage setPage={navigate} />;
      case "payment-complete": return <PaymentCompletePage setPage={navigate} />;
      case "auth-callback": return <AuthCallback setPage={navigate} />;
      case "myai": return <ChatPage />;
      case "jobs": return <JobsPage focusJobSlug={focusJobSlug} />;
      case "companies": return <CompaniesPage setPage={navigate} />;
      case "company-posts": return <CompanyPostsPage
        companyId={sessionStorage.getItem("company_posts_id")}
        companyName={sessionStorage.getItem("company_posts_name")}
        setPage={navigate}
      />;
      case "professionals": return <ProfessionalsPage setPage={navigate} />;
      case "profile": return <ProfilePage />;
      case "settings": return <SettingsPage setPage={navigate} />;
      case "my-posts": return <MyPostsPage setPage={navigate} />;
      case "my-jobs": return <ManageJobsPage setPage={navigate} />;
      case "edit-profile": return <EditProfilePage setPage={navigate} />;
      case "news": return <NewsPage setPage={navigate} />;
      case "my-network": return <MyNetworkPage setPage={navigate} />;
      case "following": return <FollowingPage setPage={navigate} setSelectedUserId={setSelectedUserId} />;
      case "user-profile": return <UserProfilePage userId={selectedUserId} setPage={navigate} />;
      case "profile-views": return <ProfileViewsPage setPage={navigate} />;
      case "companies-viewed": return <CompaniesViewedPage setPage={navigate} />;
      case "profile-stats": return <ProfileStatsPage setPage={navigate} />;
      case "saved-posts": return <SavedPostsPage setPage={navigate} />;
      case "inbox": return user?.accountType === "company"
        ? <CompanyInboxPage setPage={navigate} setSelectedUserId={setSelectedUserId} />
        : <InboxPage setPage={navigate} />;
      case "applications": return <ApplicationsPage setPage={navigate} />;
      case "my-job-posts": return <MyJobPostsPage setPage={navigate} />;
      case "company-dashboard": return <CompanyDashboardPage setPage={navigate} />;
      case "company-pricing": return <CompanyPricingPage setPage={navigate} />;
      case "team-members": return <TeamMembersPage setPage={navigate} />;
      case "billing": return <BillingPage setPage={navigate} />;
      case "change-email": return <ChangeEmailPage setPage={navigate} />;
      case "change-password": return <ChangePasswordPage setPage={navigate} />;
      case "shared-ai": return <SharedAIPage chatId={sharedChatId} setPage={navigate} />;
      case "admin-login": return <AdminLogin onSuccess={() => setPage("admin")} />;
      case "admin": return user?.accountType === "admin" ? <AdminDashboard setPage={navigate} /> : <HomePage setPage={navigate} />;
      case "admin-post-ai": return <AdminPostAI setPage={navigate} />;
      case "admin-users": return <AdminUsers setPage={navigate} />;
      case "admin-vouchers": return <AdminVouchers setPage={navigate} />;
      case "admin-moderation": return <AdminModeration setPage={navigate} />;
      case "admin-jobs": return <AdminJobs setPage={navigate} />;
      case "admin-analytics": return <AdminAnalytics setPage={navigate} />;
      case "admin-announcements": return <AdminAnnouncements setPage={navigate} />;
      case "admin-settings": return <AdminSettings setPage={navigate} />;
      default: return <HomePage setPage={navigate} setSelectedUserId={setSelectedUserId} />;
    }
  };

  const handleNavClick = (navPage) => {
    if (navPage === "post") {
      setShowPostComposer(true);
      return;
    }
    navigate(navPage);
  };
const isAdminPage = page === "admin" || page === "admin-login" || page.startsWith("admin-");

  return (
    <div className="app-root">
      
      <InAppNotificationBanner />
      <ExpiryBanner onRenew={() => handleNavClick("premium")} />
      {!isAdminPage && <DesktopSidebar page={page} setPage={handleNavClick} />}
      <main className="app-main">
        <ErrorBoundary key={page}>{renderPage()}</ErrorBoundary>
      </main>
      {!isAdminPage && <BottomNav page={page} setPage={handleNavClick} />}
      {showPostComposer && <PostComposer onClose={() => setShowPostComposer(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <PostsProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </PostsProvider>
  );
}



