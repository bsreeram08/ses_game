"use client";

import { useEffect, useState } from "react";

interface RelativeTimeProps {
  timestamp: { toDate: () => Date } | null;
  fallback?: string;
}

export function RelativeTime({ timestamp, fallback = "Unknown" }: RelativeTimeProps) {
  const [timeString, setTimeString] = useState<string | null>(null);
  
  useEffect(() => {
    if (!timestamp) {
      setTimeString(fallback);
      return;
    }
    
    const calculateTime = () => {
      const date = timestamp.toDate();
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.round(diffMs / 60000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? "" : "s"} ago`;

      const diffHours = Math.round(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

      const diffDays = Math.round(diffHours / 24);
      return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    };
    
    setTimeString(calculateTime());
    
    // Update every minute for recent times
    const intervalId = setInterval(() => {
      setTimeString(calculateTime());
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, [timestamp, fallback]);
  
  // Return null during SSR to prevent hydration mismatch
  if (timeString === null) {
    return null;
  }
  
  return <span>{timeString}</span>;
}
