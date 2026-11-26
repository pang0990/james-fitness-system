import { test as base, expect } from "@playwright/test";
import { initialState } from "../../src/lib/domain";

/**
 * BROWSER-ONLY authentication fixture.
 *
 * Mimics an already-cached Supabase session so UI/localStorage workflows can
 * be regression-tested without a real Google login or production credentials.
 * This token is unsigned and cannot authorize any Supabase API access.
 * Real OAuth and RLS must be tested independently in a safe test project.
 */
export const TEST_USER_ID = "00000000-0000-4000-8000-000000000042";
export const DATA_KEY = `james-fitness-user-v1:${TEST_USER_ID}`;

const enc = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
const accessToken = [
  enc({ alg: "none", typ: "JWT" }),
  enc({ sub: TEST_USER_ID, aud: "authenticated", role: "authenticated", exp: expiresAt }),
  "test-only-unsigned",
].join(".");
const created = new Date().toISOString();
const session = {
  access_token: accessToken,
  token_type: "bearer",
  expires_in: 7 * 24 * 60 * 60,
  expires_at: expiresAt,
  refresh_token: "invalid-browser-test-only-refresh",
  user: {
    id: TEST_USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "browser-test@example.invalid",
    app_metadata: { provider: "google", providers: ["google"] },
    user_metadata: {},
    created_at: created,
    updated_at: created,
  },
};

export const test = base.extend({
  page: async ({ page }, use) => {
    // Never contact a real Supabase service in synthetic-account tests.
    // A deterministic, immediate 401 avoids waiting seven seconds for the
    // cloud guard on every full-page navigation. This is NOT a valid token
    // and deliberately does not simulate successful cloud synchronization.
    // Explicit offline tests can override this route with route.abort().
    await page.route("https://*.supabase.co/**", route =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          code: "PGRST301",
          message: "Isolated browser test: synthetic identity has no cloud access",
          details: null,
          hint: null,
        }),
      }),
    );
    await page.addInitScript(({ session, initial, dataKey }) => {
      if (!window.localStorage.getItem("jfs-google-session-v1")) {
        window.localStorage.setItem("jfs-google-session-v1", JSON.stringify(session));
      }
      if (!window.localStorage.getItem(dataKey)) {
        window.localStorage.setItem(dataKey, JSON.stringify(initial));
      }
    }, { session, initial: initialState(), dataKey: DATA_KEY });
    await use(page);
  },
});

export { expect };
