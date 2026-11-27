import { test } from "node:test";
import assert from "node:assert/strict";
import { validateState } from "../src/lib/domain";
import { makeReviewSeed } from "../src/lib/review-preview";

test("historic appearance preferences survive account validation and serialization", () => {
  for (const theme of ["light", "dark", "system"] as const) {
    for (const visualStyle of ["cinematic", "minimal", undefined] as const) {
      const state = makeReviewSeed("2026-11-19");
      state.appearance = { theme, showCompanion: true, visualStyle };
      const stored = JSON.parse(JSON.stringify(state));
      assert.deepEqual(validateState(structuredClone(stored)), stored);
    }
  }
});
