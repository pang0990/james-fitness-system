import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, setMealSkipped, validateState, mealCompletion } from "../src/lib/domain";

test("uneaten meal slot can be stored and restored with a valid ISO date", () => {
  const date="2026-10-22";
  const state=initialState();
  setMealSkipped(state,date,"早餐",true);
  assert.equal(state.skippedMealSlots?.length,1);
  assert.equal(state.skippedMealSlots?.[0].date,date);
  const parsed=validateState(JSON.parse(JSON.stringify(state)));
  assert.equal(parsed.skippedMealSlots?.[0].slot,"早餐");
  assert.equal(mealCompletion(parsed,date).slots[0].status,"skipped");
});

test("meal slot skipping rejects malformed calendar date rather than corrupting an account snapshot", () => {
  const state=initialState();
  state.skippedMealSlots=[{date:"invalid",slot:"午餐",createdAt:new Date().toISOString()}];
  assert.throws(()=>validateState(state),/餐次未吃標記格式無效/);
});
