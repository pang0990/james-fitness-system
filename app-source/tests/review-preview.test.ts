import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeReviewSeed, REVIEW_STORAGE_KEY, REVIEW_USER_ID,
} from "../src/lib/review-preview";
import { mealTotals, validateState, waterTotal } from "../src/lib/domain";

const day = "2026-10-21";
test("isolated review fixture is structurally valid and entirely synthetic", () => {
  const state = makeReviewSeed(day);
  assert.deepEqual(validateState(structuredClone(state)), state);
  assert.equal(state.profile?.name, "測試使用者（虛構）");
  assert.equal(state.profile?.goal, "CUT");
  assert.equal(state.cycles?.[0].pending?.length, 2);
  assert.equal(state.sessions.length, 2);
  assert.equal(state.meals.length, 2);
  assert.equal(state.measurements.length, 3);
  assert.equal(state.dailySteps?.length, 7);
  assert.ok(REVIEW_STORAGE_KEY.startsWith("jfs-isolated-review-v1:"));
  assert.ok(REVIEW_STORAGE_KEY.includes(REVIEW_USER_ID));
  assert.notEqual(REVIEW_STORAGE_KEY, "james-fitness-user-v1:" + REVIEW_USER_ID);
});
test("review's nutrition and hydration contain deterministic test data only", () => {
  const state = makeReviewSeed(day);
  assert.equal(mealTotals(state, day).kcal, 960);
  assert.equal(waterTotal(state, day), 750);
  assert.equal(state.versions.length, 1);
  assert.ok(state.versions[0].reason.includes("虛構"));
});
test("review data dates are generated relative to the selected review day", () => {
  const one = makeReviewSeed("2026-01-10");
  const two = makeReviewSeed("2026-03-12");
  assert.equal(one.meals[0].date, "2026-01-10");
  assert.equal(two.meals[0].date, "2026-03-12");
  assert.equal(one.measurements.at(-1)?.date, "2026-01-10");
  assert.equal(two.measurements.at(-1)?.date, "2026-03-12");
});
