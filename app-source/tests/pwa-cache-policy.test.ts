import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";

test("generated PWA worker excludes OAuth callbacks and query-bearing URLs", () => {
  const temp = mkdtempSync(path.join(os.tmpdir(), "jfs-pwa-test-"));
  try {
    const out = path.join(temp, "out");
    const assets = path.join(out, "_next", "static");
    mkdirSync(assets, { recursive: true });
    writeFileSync(path.join(assets, "test.js"), "/* compiled app fixture */");
    const source = path.resolve(process.cwd(), "scripts/build-pwa.mjs");
    const generated = spawnSync(process.execPath, [source], {
      cwd: temp,
      env: { ...process.env, NEXT_PUBLIC_BASE_PATH: "/james-fitness-system" },
      encoding: "utf8",
    });
    assert.equal(generated.status, 0, generated.stderr);
    const handlers: Record<string, (event: any) => void> = {};
    const worker = readFileSync(path.join(out, "sw.js"), "utf8");
    vm.runInNewContext(worker, {
      URL,
      // Safe mock for allowed GETs; no network requests in this unit test.
      fetch: async () => ({ ok: false }),
      self: {
        location: { origin: "https://example.test" },
        addEventListener: (name: string, fn: (event: any) => void) => {
          handlers[name] = fn;
        },
      },
    });
    assert.ok(handlers.fetch, "worker must register a fetch listener");
    const intercepted = (suffix: string, cache = "default") => {
      let didIntercept = false;
      handlers.fetch({
        request: {
          url: "https://example.test/james-fitness-system/" + suffix,
          method: "GET",
          cache,
        },
        respondWith: () => { didIntercept = true; },
      });
      return didIntercept;
    };
    assert.equal(intercepted("auth/callback/?code=oauth-secret"), false);
    assert.equal(intercepted("auth/error/"), false);
    assert.equal(intercepted("today/?code=oauth-secret"), false);
    assert.equal(intercepted("nutrition/recipes/detail/?recipe=private-entry"), false);
    assert.equal(intercepted("today/", "no-store"), false);
    assert.equal(intercepted("today/"), true);
    assert.equal(intercepted("_next/static/test.js"), true);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
