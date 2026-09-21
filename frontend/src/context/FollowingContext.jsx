import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { useAuth } from "./AuthContext";

const FollowingContext = createContext({
  isFollowing: () => false,
  follow: () => {},
  unfollow: () => {},
  followingIds: [],
  ready: false,
});

const LS_KEY = "omnixra_following";

function readLocal() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
}

function writeLocal(list) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {}
}

export function FollowingProvider({ children }) {
  const { user } = useAuth();
  const [ids, setIds] = useState(() => readLocal());
  const [ready, setReady] = useState(false);
  const idsRef = useRef(ids);
  useEffect(() => { idsRef.current = ids; }, [ids]);

  // Hydrate from backend on login (source of truth)
  useEffect(() => {
    let cancelled = false;
    if (!user?._id) { setReady(true); return; }
    (async () => {
      try {
        const res = await api.get("/posts/following/list");
        const server = (res.data?.following || []).map(String);
        if (cancelled) return;
        // Merge with local — union is safest (don't lose local follows)
        const merged = Array.from(new Set([...readLocal(), ...server]));
        setIds(merged);
        writeLocal(merged);
      } catch (e) {
        console.warn("[following] hydrate failed:", e.message);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user?._id]);

  const isFollowing = useCallback((userId) => {
    if (!userId) return false;
    return idsRef.current.includes(String(userId));
  }, []);

  const follow = useCallback(async (userId) => {
    const id = String(userId);
    if (!id) return;
    // Optimistic
    setIds(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      writeLocal(next);
      return next;
    });
    try {
      await api.put(`/posts/follow-user/${id}`);
    } catch (e) {
      // Revert
      setIds(prev => {
        const next = prev.filter(x => x !== id);
        writeLocal(next);
        return next;
      });
      console.error("[follow] failed:", e.message);
      throw e;
    }
  }, []);

  const unfollow = useCallback(async (userId) => {
    const id = String(userId);
    if (!id) return;
    // Optimistic
    setIds(prev => {
      const next = prev.filter(x => x !== id);
      writeLocal(next);
      return next;
    });
    try {
      await api.put(`/posts/follow-user/${id}`);
    } catch (e) {
      // Revert
      setIds(prev => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        writeLocal(next);
        return next;
      });
      console.error("[unfollow] failed:", e.message);
      throw e;
    }
  }, []);

  return (
    <FollowingContext.Provider value={{ isFollowing, follow, unfollow, followingIds: ids, ready }}>
      {children}
    </FollowingContext.Provider>
  );
}

export function useFollowing() {
  return useContext(FollowingContext);
}

export default FollowingContext;
