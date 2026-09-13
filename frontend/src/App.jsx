import React, { useState, useEffect } from "react";
import LoadingScreen from "./components/LoadingScreen";
import ErrorBoundary from "./components/ErrorBoundary";
import AuthScreen from "./components/AuthScreen";
import BottomNav from "./components/BottomNav";
import DesktopSidebar from "./components/DesktopSidebar";
import HomePage from "./pages/HomePage";
import ChatPage from "./pages/ChatPage";
import JobsPage from "./pages/JobsPage";
import CompaniesPage from "./pages/CompaniesPage";
import ProfessionalsPage from "./pages/ProfessionalsPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import MyPostsPage from "./pages/MyPostsPage";
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

function AppContent() {
  // ── ALL HOOKS AT THE TOP ──
  const [splashDone, setSplashDone] = useState(false);
  const [page, setPage] = useState("home");
  const [showPostComposer, setShowPostComposer] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [sharedChatId, setSharedChatId] = useState(null);
  const [focusPostId, setFocusPostId] = useState(null);
  const [focusJobSlug, setFocusJobSlug] = useState(null);
  const [history, setHistory] = useState([]);
  const { user, loading: authLoading } = useAuth();

  // ── Helper functions ──
  const navigate = (to) => {
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

  // ── ALL useEffects (in order) ──
  useEffect(() => {
    const handlePopState = () => {
      if (!goBack()) window.history.back();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [history]);

  // Check URL for admin + shared links on mount
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/admin-login")) {
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



  // ── EARLY RETURNS (all hooks above this line) ──
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

  // ── Main render helpers ──
  const renderPage = () => {
    switch (page) {
      case "home": return <HomePage setPage={navigate} setSelectedUserId={setSelectedUserId} focusPostId={focusPostId} />;
      case "myai": return <ChatPage />;
      case "jobs": return <JobsPage focusJobSlug={focusJobSlug} />;
      case "companies": return <CompaniesPage />;
      case "professionals": return <ProfessionalsPage setPage={navigate} />;
      case "profile": return <ProfilePage />;
      case "settings": return <SettingsPage />;
      case "my-posts": return <MyPostsPage setPage={navigate} />;
      case "edit-profile": return <EditProfilePage setPage={navigate} />;
      case "news": return <NewsPage setPage={navigate} />;
      case "my-network": return <MyNetworkPage setPage={navigate} />;
      case "following": return <FollowingPage setPage={navigate} setSelectedUserId={setSelectedUserId} />;
      case "user-profile": return <UserProfilePage userId={selectedUserId} setPage={navigate} />;
      case "profile-views": return <ProfileViewsPage setPage={navigate} />;
      case "companies-viewed": return <CompaniesViewedPage setPage={navigate} />;
      case "profile-stats": return <ProfileStatsPage setPage={navigate} />;
      case "saved-posts": return <SavedPostsPage setPage={navigate} />;
      case "inbox": return <InboxPage setPage={navigate} />;
      case "applications": return <ApplicationsPage setPage={navigate} />;
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
