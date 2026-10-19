import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runInNewContext } from "node:vm";

test("PWA worker never intercepts OAuth callbacks or URLs with auth tokens", () => {
  const temp = mkdtempSync(join(tmpdir(), "jfs-pwa-"));
  try {
    mkdirSync(join(temp, "out", "_next"), { recursive: true });
    const builder = resolve(process.cwd(), "scripts/build-pwa.mjs");
    execFileSync(process.execPath, [builder], {
      cwd: temp,
      env: { ...process.env, NEXT_PUBLIC_BASE_PATH: "/james-fitness-system" },
    });
    const source = readFileSync(join(temp, "out", "sw.js"), "utf8");
    const listeners: Record<string, (event: unknown) => void> = {};
    const origin = "https://example.test";
    runInNewContext(source, {
      URL,
      self: {
        location: { origin },
        addEventListener: (event: string, handler: (event: unknown) => void) => {
          listeners[event] = handler;
        },
      },
      fetch: async () => ({ ok: false }),
      caches: { open: async () => ({ match: async () => null }) },
      Response: { error: () => new Error("offline") },
    });
    assert.equal(typeof listeners.fetch, "function");
    const handled = (url: string, method = "GET") => {
      let intercepted = false;
      listeners.fetch({
        request: { url, method, mode: "navigate" },
        respondWith: () => { intercepted = true; },
      });
      return intercepted;
    };
    const base = origin + "/james-fitness-system";
    assert.equal(handled(base + "/auth/callback/?code=one-time-oauth-code"), false);
    assert.equal(handled(base + "/auth/error/?error_description=oauth-failure"), false);
    assert.equal(handled(base + "/today/?access_token=secret"), false);
    assert.equal(handled(base + "/today/?refresh_token=secret"), false);
    assert.equal(handled(base + "/today/?state=oauth-state"), false);
    assert.equal(handled(base + "/today/"), true);
    assert.equal(handled(base + "/nutrition/"), true);
    assert.equal(handled(base + "/today/", "POST"), false);
    assert.equal(handled(origin + "/unrelated/"), false);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
