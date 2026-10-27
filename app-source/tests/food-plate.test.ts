import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, validateState, visibleMeals } from "../src/lib/domain";
import {
  commitPlate,
  portion,
  suggestedFoodIds,
  mealSnapshot,
  type PlateItem,
} from "../src/lib/food-plate";
const at = "2026-10-27T02:00:00Z";
const item = (id = "a"): PlateItem => ({
  id,
  quantity: 150,
  snapshot: {
    name: "rice",
    quantity: 100,
    unit: "g",
    foodId: "rice-v1",
    foodVersion: 1,
    p: 2,
    c: 30,
    f: 1,
    kcal: 137,
  },
});
test("plate scales source calories, validates all rows before mutation, retries once", () => {
  const s = initialState();
  const before = JSON.stringify(s);
  assert.throws(() =>
    commitPlate(
      s,
      [item(), { ...item("b"), quantity: 0 }],
      "2026-10-27",
      "早餐",
      at,
    ),
  );
  assert.equal(JSON.stringify(s), before);
  commitPlate(s, [item(), item("b")], "2026-10-27", "早餐", at);
  commitPlate(s, [item(), item("b")], "2026-10-27", "早餐", at);
  assert.equal(s.meals.length, 2);
  assert.equal(s.meals[0].kcal, 205.5);
  assert.equal(s.meals[0].c, 45);
  assert.equal(s.meals[0].foodVersion, 1);
  assert.throws(() =>
    commitPlate(s, [item(), item("c")], "2026-10-27", "早餐", at),
  );
  assert.equal(s.meals.length, 2);
});
test("copied meals retain snapshots without supersession and leave original intact", () => {
  const s = initialState();
  commitPlate(s, [item()], "2026-10-26", "早餐", at);
  const original = JSON.stringify(s.meals[0]);
  const snapshot = mealSnapshot(s.meals[0]);
  commitPlate(
    s,
    [{ id: "copy", snapshot, quantity: snapshot.quantity }],
    "2026-10-27",
    "午餐",
    at,
  );
  assert.equal(JSON.stringify(s.meals[0]), original);
  assert.equal(s.meals[1].kcal, s.meals[0].kcal);
  assert.equal(s.meals[1].supersedes, undefined);
  assert.equal(visibleMeals(s).length, 2);
});
test("saved meals additive backup roundtrip preserves old data, rejects malformed snapshot", () => {
  const s = initialState();
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))), s);
  s.savedMeals = [
    { id: "t", name: "套餐", createdAt: at, items: [portion(item())] },
  ];
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))), s);
  const invalid = structuredClone(s);
  invalid.savedMeals![0].items[0].quantity = 0;
  assert.throws(() => validateState(invalid));
  const rollback = structuredClone(s);
  delete rollback.savedMeals;
  assert.deepEqual(rollback, initialState());
});
test("suggestions count only visible same-slot meals, ignoring deleted and replaced rows", () => {
  const s = initialState();
  commitPlate(s, [item()], "2026-10-26", "早餐", at);
  s.meals.push({
    ...s.meals[0],
    id: "new",
    foodId: "new-food",
    supersedes: "a",
  });
  s.meals.push({ ...s.meals[0], id: "deleted", deleted: true });
  s.meals.push({
    ...s.meals[0],
    id: "lunch",
    slot: "午餐",
    foodId: "lunch",
    supersedes: undefined,
  });
  assert.deepEqual(suggestedFoodIds(s, "早餐"), ["new-food"]);
});

test("unchanged snapshot preserves precision rather than rounding historical values",()=>{
 const original=item();original.quantity=original.snapshot.quantity;original.snapshot.p=2.12345;original.snapshot.kcal=137.12345;
 assert.deepEqual(portion(original),original.snapshot);
});

test("future actual intake is rejected atomically; history and past copies remain unchanged", () => {
 const s=initialState(), before=JSON.stringify(s);
 assert.throws(()=>commitPlate(s,[item()],"2026-10-29","早餐",at),/未來日期/);
 assert.equal(JSON.stringify(s),before);
 commitPlate(s,[item()],"2026-10-26","早餐",at);
 assert.equal(s.meals[0].date,"2026-10-26");
});
