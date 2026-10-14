"use client";

import { createClient } from "@supabase/supabase-js";

/**
 * These are PUBLIC browser connection identifiers, not server-side secrets.
 * RLS must protect every private database table before cloud data is enabled.
 * Never add a Google Client Secret, sb_secret_*, or service_role key here.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://eszdtxsvwgejnbsczgxf.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_Pw3JFcyM1H-pkIyyCHgMtw_At1mVCZq";

export const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "/james-fitness-system";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storageKey: "jfs-google-session-v1",
    flowType: "pkce",
    detectSessionInUrl: false,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const appHref = (path: string) =>
  `${appBasePath}/${path.replace(/^\\/+|\\/+$/g, "")}/`;
