import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export function usePageTracking() {
  const [location] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    fetch("/api/analytics/event", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "page_view", metadata: { path: location } }),
    }).catch(() => {});
  }, [location, user?.id]);
}
