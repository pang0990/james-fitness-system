import type { User } from "@supabase/supabase-js";

/** Explicit opt-in offline account, never a Supabase identity or JWT. */
export const GUEST_USER_ID = "jfs-local-guest-v1";
export const GUEST_MODE_KEY = "jfs-guest-mode-v1";
export const GUEST_DATA_KEY = "james-fitness-user-v1:" + GUEST_USER_ID;
export const GUEST_IMPORT_SKIPPED = "jfs-guest-import-skipped:";

export function guestIdentity(): User {
  return {
    id:GUEST_USER_ID, aud:"guest-local",role:"guest-local",
    email:undefined, app_metadata:{provider:"local_guest"},
    user_metadata:{},created_at:"2026-01-01T00:00:00.000Z",
  } as User;
}
