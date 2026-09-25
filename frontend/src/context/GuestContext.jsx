import React, { createContext, useCallback, useContext, useState } from "react";

const GuestContext = createContext({
  requireAuth: () => {},
  isGuest: true,
  closePrompt: () => {},
  prompt: null,
});

const ACTION_COPY = {
  like:      { icon: "❤️", title: "Sign in to like posts", subtitle: "Join thousands of Zimbabweans finding jobs on Omnixra AI." },
  comment:   { icon: "💬", title: "Join the conversation", subtitle: "Sign up to comment, reply, and connect with other Zimbabweans." },
  follow:    { icon: "👥", title: "Sign in to follow", subtitle: "Follow companies and professionals to see their latest posts and jobs." },
  save:      { icon: "🔖", title: "Save this?", subtitle: "Sign up free to save jobs and posts, and get alerts when new ones match you." },
  apply:     { icon: "🚀", title: "Ready to apply?", subtitle: "Sign up free — takes 10 seconds:", bullets: ["Apply to unlimited jobs","Track all your applications","Get alerts for new job matches"] },
  pushcv:    { icon: "📤", title: "Push your CV to 200+ companies", subtitle: "Sign up free — one tap sends your CV to every matching employer." },
  ai:        { icon: "✨", title: "Unlock Omnixra AI", subtitle: "Sign up free to keep chatting with your personal AI career assistant.", bullets: ["Unlimited AI conversations","Personalised job matching","CV and cover letter writing"] },
  post:      { icon: "✍️", title: "Share something?", subtitle: "Sign up free to post, share, and connect with your network." },
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
