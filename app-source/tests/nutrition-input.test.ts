import { test } from "node:test";
import assert from "node:assert/strict";
import { validateNewMealInput } from "../src/lib/nutrition-input";

const valid = {
  name: "  測試便當  ", slot: "午餐", quantity: 1, p: 20, c: 30, f: 10, kcal: 290,
};
test("new Nutrition meal validation accepts safe values and trims user text", () => {
  const result = validateNewMealInput(valid);
  assert.equal(result.name, "測試便當");
  assert.equal(result.slot, "午餐");
  assert.equal(result.kcal, 290);
  assert.equal(valid.name, "  測試便當  ");
});
for (const patch of [
  {p: -1}, {c: Infinity}, {f: NaN}, {p: 1000.1},
  {kcal: 10001}, {quantity: -1}, {quantity: 0},
  {quantity: Infinity}, {name: "   "}, {slot: ""},
]) {
  test("new Nutrition meal validation rejects invalid entry " + JSON.stringify(patch), () => {
    assert.throws(() => validateNewMealInput({...valid, ...patch}));
  });
}
