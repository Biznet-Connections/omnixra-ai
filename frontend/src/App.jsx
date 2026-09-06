import React, { useState, useEffect } from "react";
import LoadingScreen from "./components/LoadingScreen";
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
import PostComposer from "./components/PostComposer";
import { useAuth } from "./context/AuthContext";
import { PostsProvider } from "./context/PostsContext";

function AppContent() {
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("home");
  const [showPostComposer, setShowPostComposer] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [history, setHistory] = useState([]);
  const { user } = useAuth();

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

  useEffect(() => {
    const handlePopState = () => {
      if (!goBack()) window.history.back();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [history]);

  if (loading) return <LoadingScreen onFinish={() => setLoading(false)} />;
  if (!user) return <AuthScreen />;

  const renderPage = () => {
    switch (page) {
      case "home": return <HomePage setPage={navigate} setSelectedUserId={setSelectedUserId} />;
      case "myai": return <ChatPage />;
      case "jobs": return <JobsPage />;
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

  return (
    <div className="app-root">
      <DesktopSidebar page={page} setPage={handleNavClick} />
      <main className="app-main">{renderPage()}</main>
      <BottomNav page={page} setPage={handleNavClick} />
      {showPostComposer && <PostComposer onClose={() => setShowPostComposer(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <PostsProvider>
      <AppContent />
    </PostsProvider>
  );
}
