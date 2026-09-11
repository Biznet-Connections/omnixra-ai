import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({});
  const [lastSeenMap, setLastSeenMap] = useState({});
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const token = localStorage.getItem("omnixra_token");
    
    // Detect native app (Capacitor)
    const isNative = typeof window !== "undefined" && (
      window.Capacitor?.isNativePlatform?.() ||
      window.location.protocol === "capacitor:" ||
      window.location.protocol === "file:"
    );
    
    // Socket server URL: production in native, auto in web
    const socketURL = isNative ? "https://omnixra-ai.com" : undefined;
    
    const newSocket = io(socketURL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 20000
    });

    newSocket.on("connect", () => {
      console.log("✅ Socket connected");
    });

    newSocket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
    });

    newSocket.on("new-post", (post) => {
      window.dispatchEvent(new CustomEvent("socket-new-post", { detail: post }));
    });

    newSocket.on("post-deleted", ({ postId }) => {
      window.dispatchEvent(new CustomEvent("socket-post-deleted", { detail: postId }));
    });

    newSocket.on("post-liked", (data) => {
      window.dispatchEvent(new CustomEvent("socket-post-liked", { detail: data }));
    });

    newSocket.on("post-commented", (data) => {
      window.dispatchEvent(new CustomEvent("socket-post-commented", { detail: data }));
    });

    newSocket.on("new-message", ({ conversationId, message }) => {
      window.dispatchEvent(new CustomEvent("socket-new-message", { detail: { conversationId, message } }));
    });

    newSocket.on("conversation-deleted", ({ conversationId }) => {
      window.dispatchEvent(new CustomEvent("socket-conversation-deleted", { detail: { conversationId } }));
    });

    newSocket.on("typing", ({ conversationId, userId, isTyping }) => {
      setTypingUsers(prev => {
        const newTyping = { ...prev };
        if (isTyping) {
          newTyping[conversationId] = userId;
        } else {
          delete newTyping[conversationId];
        }
        return newTyping;
      });
    });

    newSocket.on("message-read", ({ conversationId, readerId }) => {
      window.dispatchEvent(new CustomEvent("socket-message-read", { detail: { conversationId, readerId } }));
    });

    newSocket.on("connection-request", (request) => {
      window.dispatchEvent(new CustomEvent("socket-connection-request", { detail: request }));
    });

    newSocket.on("connection-accepted", (user) => {
      window.dispatchEvent(new CustomEvent("socket-connection-accepted", { detail: user }));
    });

    newSocket.on("follow-update", ({ followerId, isFollowing }) => {
      window.dispatchEvent(new CustomEvent("socket-follow-update", { detail: { followerId, isFollowing } }));
    });

    newSocket.on("user-online", (userId) => {
      setOnlineUsers(prev => new Set(prev).add(userId));
      window.dispatchEvent(new CustomEvent("socket-user-online", { detail: { userId } }));
    });

    newSocket.on("user-offline", ({ userId, lastSeen }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      setLastSeenMap(prev => ({ ...prev, [userId]: lastSeen }));
      window.dispatchEvent(new CustomEvent("socket-user-offline", { detail: { userId, lastSeen } }));
    });

    newSocket.on("unread-count", ({ count }) => {
      window.dispatchEvent(new CustomEvent("socket-unread-count", { detail: { count } }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user?._id]);

  const emitTyping = (conversationId, recipientId, isTyping) => {
    if (socket) socket.emit("typing", { conversationId, recipientId, isTyping });
  };

  const emitMarkRead = (conversationId, senderId) => {
    if (socket) socket.emit("mark-read", { conversationId, senderId });
  };

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, typingUsers, lastSeenMap, emitTyping, emitMarkRead }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
