import React, { createContext, useCallback, useContext, useState } from "react";

const GuestContext = createContext({
  requireAuth: () => {},
  isGuest: true,
  closePrompt: () => {},
  prompt: null,
});

const ACTION_COPY = {
  like:         { icon: "❤️", title: "Sign in to like posts", subtitle: "Join thousands of professionals finding jobs on Omnixra AI." },
  comment:      { icon: "💬", title: "Join the conversation", subtitle: "Sign up to comment, reply, and connect with professionals worldwide." },
  follow:       { icon: "👥", title: "Sign in to follow", subtitle: "Follow companies and professionals to see their latest posts and jobs." },
  save:         { icon: "🔖", title: "Save this?", subtitle: "Sign up free to save jobs and posts, and get alerts when new ones match you." },
  apply:        { icon: "🚀", title: "Ready to apply?", subtitle: "Sign up free — takes 10 seconds:", bullets: ["Apply to unlimited jobs","Track all your applications","Get alerts for new job matches"] },
  pushcv:       { icon: "📤", title: "Push your CV to 200+ companies", subtitle: "Sign up free — one tap sends your CV to every matching employer." },
  ai:           { icon: "✨", title: "Unlock Omnixra AI", subtitle: "Sign up free to keep chatting with your personal AI career assistant.", bullets: ["Unlimited AI conversations","Personalised job matching","CV and cover letter writing"] },
  post:         { icon: "✍️", title: "Share something?", subtitle: "Sign up free to post, share, and connect with your network." },
  profile:      { icon: "👤", title: "Create your profile", subtitle: "Register to build your profile and let employers discover you.", bullets: ["Get discovered by 500+ companies","AI-powered CV and career tools","Track every application"] },
  following:    { icon: "👥", title: "Your Following", subtitle: "Sign up to follow companies and professionals. Get their new posts and jobs in your feed.", bullets: ["Follow anyone instantly","Curated feed of who you care about","Job alerts from followed companies"] },
  inbox:        { icon: "💬", title: "Your Inbox", subtitle: "Sign up to message employers and other job seekers.", bullets: ["Direct message companies","Reply to job invites","Chat with candidates (companies)"] },
  alerts:       { icon: "🔔", title: "Your Alerts", subtitle: "Sign up to get notified when things happen.", bullets: ["Someone mentions you","Your post gets likes or comments","New jobs match your profile"] },
  applications: { icon: "📋", title: "Your Applications", subtitle: "Sign up to track every job you apply to — all in one place.", bullets: ["See application status updates","Get reminders to follow up","One-tap re-apply to similar jobs"] },
  myposts:      { icon: "📝", title: "Your Posts", subtitle: "Sign up to share updates, articles, and opportunities with your network.", bullets: ["Share posts, photos, videos","Build your professional brand","Reach thousands of job seekers"] },
  message:      { icon: "💬", title: "Send a message", subtitle: "Sign up free to send direct messages to companies and job seekers." },
  myjobs:       { icon: "💼", title: "My Job Posts", subtitle: "Sign up to post jobs and manage applications.", bullets: ["Post unlimited jobs","AI matches best candidates","Message applicants directly"] },
  dashboard:    { icon: "📊", title: "Company Dashboard", subtitle: "Sign up to see your hiring performance at a glance.", bullets: ["Track applications","View candidate insights","Boost your visibility"] },
};

export function GuestProvider({ children, user }) {
  const [prompt, setPrompt] = useState(null);
  const isGuest = !user;

  const requireAuth = useCallback((action, meta = {}) => {
    if (user) return false;
    const copy = ACTION_COPY[action] || ACTION_COPY.like;
    setPrompt({ action, copy, meta });
    return true;
  }, [user]);

  const closePrompt = useCallback(() => setPrompt(null), []);

  return (
    <GuestContext.Provider value={{ requireAuth, closePrompt, prompt, isGuest }}>
      {children}
    </GuestContext.Provider>
  );
}

export function useGuest() {
  return useContext(GuestContext);
}

export default GuestContext;
