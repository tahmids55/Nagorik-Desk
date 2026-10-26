"use client";

import { useEffect } from "react";
import { markNotificationsRead } from "@/server/actions/profile";

/** Marks everything as read a moment after the list has been shown. */
export function MarkRead({ unread }: { unread: number }) {
  useEffect(() => {
    if (unread === 0) return;
    const h = setTimeout(() => void markNotificationsRead(), 1500);
    return () => clearTimeout(h);
  }, [unread]);
  return null;
}
