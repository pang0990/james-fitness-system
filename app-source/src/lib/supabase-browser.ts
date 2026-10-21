"use client";

import { createClient } from "@supabase/supabase-js";

/**
 * These are PUBLIC browser connection identifiers, not server-side secrets.
 * RLS must protect every private database table before cloud data is enabled.
 * Never add a Google Client Secret, sb_secret_*, or service_role key here.
 */
// The review-only build must never contact the real project's Auth or database.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_JFS_REVIEW_PREVIEW === "1"
    ? "https://review-preview.invalid"
    : process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://eszdtxsvwgejnbsczgxf.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_JFS_REVIEW_PREVIEW === "1"
    ? "preview-key-with-no-permissions"
    : process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_Pw3JFcyM1H-pkIyyCHgMtw_At1mVCZq";

export const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storageKey: "jfs-google-session-v1",
    flowType: "pkce",
    detectSessionInUrl: false,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const appHref = (path: string) => {
  const clean = path.split("/").filter(Boolean).join("/");
  return `${appBasePath}/${clean}/`;
};
