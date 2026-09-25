import React from "react";
import { useAuth } from "./AuthContext";
import { GuestProvider } from "./GuestContext";

export default function GuestWrapper({ children }) {
  const { user } = useAuth();
  return <GuestProvider user={user}>{children}</GuestProvider>;
}
