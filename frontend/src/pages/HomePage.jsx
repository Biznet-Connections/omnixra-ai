import React, { useState } from "react";
import { UserCheck, Newspaper, Briefcase, User, FileText } from "lucide-react";
import PostCard from "../components/PostCard";
import ProfileMenu from "../components/ProfileMenu";
import LoadingDots from "../components/LoadingDots";
import { usePosts } from "../context/PostsContext";

function HomePage({ setPage, setSelectedUserId }) {
  const { posts, loading, addPost, removePost, updatePost } = usePosts();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const quickActions = [
    { icon: User, label: "Profile", action: () => setShowProfileMenu(true) },
    { icon: UserCheck, label: "Following", action: () => setPage("following") },
    { icon: Newspaper, label: "News", action: () => setPage("news") },
    { icon: Briefcase, label: "Applications", action: () => setPage("applications") },
    { icon: FileText, label: "My Posts", action: () => setPage("my-posts") }
  ];

  return (
    <div className="page-scroll">
      <div className="page-container">
        <div className="quick-actions-row">
          {quickActions.map((qa, i) => {
            const Icon = qa.icon;
            return (
              <button key={i} onClick={qa.action} className="quick-action-circle">
                <div className="quick-action-ring"><Icon size={22} /></div>
                <span>{qa.label}</span>
              </button>
            );
          })}
        </div>

        <div className="feed-section mt-4">
          {loading ? (
            <div className="flex justify-center mt-10">
              <LoadingDots />
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><FileText size={24} /></div>
              <h2 className="text-sm font-semibold mt-4">No posts yet</h2>
              <p className="text-xs text-slate-700 mt-2">Be the first to share something!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map(post => (
                <PostCard 
                  key={post._id} 
                  post={post} 
                  onUpdate={updatePost} 
                  onDelete={removePost} 
                  onViewProfile={(author) => {
                    if (author && author._id) {
                      setSelectedUserId(author._id);
                      setPage("user-profile");
                    }
                  }} 
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showProfileMenu && (
        <ProfileMenu 
          onClose={() => setShowProfileMenu(false)} 
          onNavigate={(dest) => { setShowProfileMenu(false); setPage(dest); }} 
        />
      )}
    </div>
  );
}
export default HomePage;
