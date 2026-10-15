import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

type Recipe = {
  id: string; name: string; category: string;
  ingredients: string; steps: string; kcal: number | null;
  p: number | null; c: number | null; f: number | null;
  sourceVersion: string;
};
const recipes = JSON.parse(fs.readFileSync("src/content/recipes-seed.json", "utf8")) as Recipe[];
const cookedFoods = JSON.parse(fs.readFileSync("src/content/cooked-foods.json", "utf8")) as {
  id:string; name:string; base:number; unit:string; p:number; c:number; f:number; kcal:number;
}[];
const articles = JSON.parse(fs.readFileSync("src/content/articles.json", "utf8")) as { id: string; slug: string; body: string }[];

test("129 recipe titles are indexed with requested category distribution", () => {
  assert.equal(recipes.length, 129);
  const counts = Object.fromEntries(
    ["Snacks", "Breakfast", "Main Meals"].map(x => [x, recipes.filter(r => r.category === x).length])
  );
  assert.deepEqual(counts, { Snacks: 34, Breakfast: 42, "Main Meals": 53 });
  assert.equal(new Set(recipes.map(r => r.id)).size, 129);
});
test("119 original recipe bodies and 10 title-only records are distinguished", () => {
  assert.equal(recipes.filter(r => r.sourceVersion.endsWith("title-only")).length, 10);
  assert.equal(recipes.filter(r => !r.sourceVersion.endsWith("title-only")).length, 119);
  for (const r of recipes) {
    assert.ok(r.name.trim() && r.ingredients.trim() && r.steps.trim());
    for (const k of ["p", "c", "f", "kcal"] as const) {
      assert.ok(r[k] === null || (Number.isFinite(r[k]) && r[k]! >= 0));
    }
    if (r.sourceVersion.endsWith("title-only")) {
      assert.equal(r.kcal, null);
      assert.equal(r.p, null);
      assert.equal(r.c, null);
      assert.equal(r.f, null);
    }
  }
});
test("five supplied research manuscripts are published without losing existing unique knowledge", () => {
  const names = ["fatigue-central-peripheral","exercise-recovery","exercise-recovery-evidence","recovery-adaptation","health-longevity-activity"];
  for (const id of names) {
    const article = articles.find(a => a.id === id);
    assert.ok(article, `missing ${id}`);
    assert.ok(article!.body.length > 3000, `truncated manuscript ${id}`);
  }
  assert.equal(new Set(articles.map(x => x.slug)).size, articles.length);
  assert.ok(articles.some(x => x.id === "muscle-fiber-types"));
});

test("cooked chicken breast can be logged by cooked weight", () => {
  const chicken = cookedFoods.find(x => x.id === "usda-171477");
  assert.ok(chicken);
  assert.equal(chicken!.name, "熟雞胸肉（去皮，熟重）");
  assert.deepEqual(
    {base:chicken!.base,unit:chicken!.unit,p:chicken!.p,c:chicken!.c,f:chicken!.f,kcal:chicken!.kcal},
    {base:100,unit:"g",p:31.02,c:0,f:3.57,kcal:165}
  );
});
