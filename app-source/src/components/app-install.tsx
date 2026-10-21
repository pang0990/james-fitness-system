"use client";
import { useEffect } from "react";
export function AppInstall() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_JFS_REVIEW_PREVIEW !== "1") {
      const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
      navigator.serviceWorker
        .register(base + "/sw.js", { scope: base + "/" })
        .catch(() => {});
    }
  }, []);
  return null;
}
