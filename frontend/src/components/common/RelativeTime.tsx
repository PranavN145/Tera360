"use client";

import React, { useState, useEffect } from "react";
import { formatRelativeTime } from "@/types/public";

interface RelativeTimeProps {
  date?: string | Date | null;
  fallback?: string;
  className?: string;
}

/**
 * RelativeTime Component
 * Safely renders relative time (e.g., "12 mins ago", "2 hours ago")
 * Guarantees zero SSR/hydration mismatch by rendering the stable fallback during SSR
 * and initial hydration, then transitioning to client-calculated relative time post-mount.
 */
export default function RelativeTime({
  date,
  fallback = "Recently",
  className = "",
}: RelativeTimeProps) {
  const [displayText, setDisplayText] = useState<string>(fallback);

  useEffect(() => {
    if (date) {
      setDisplayText(formatRelativeTime(date));
    }
  }, [date]);

  return <span className={className}>{displayText}</span>;
}

