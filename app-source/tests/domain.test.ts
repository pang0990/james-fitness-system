import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activePlan,
  addDays,
  createInitialPlan,
  cutReview,
  cutTargets,
  dateInZone,
  decide,
  initialState,
  mealTotals,
  pinDay,
  resolveDay,
  setDayType,
  visibleMeasurements,
  waterTotal,
  type Profile,
} from "../src/lib/domain";
const profile: Profile = {
  name: "Test",
  age: 30,
  height: 175,
  weight: 63,
  sex: "male",
  frequency: 3,
  experiencedCut: true,
  goal: "CUT",
  eligible: true,
  timezone: "Asia/Taipei",
  waterTarget: 2000,
};
test("Numbers coefficients match all 8 input branches and three day types", () => {
  const expected = {
    male: [
      [2.2, 1.4, 0.8],
      [2.5, 1.6, 0.9],
      [3, 1.7, 1],
      [3.5, 1.8, 1],
    ],
    female: [
      [2, 1.4, 1],
      [2.2, 1.6, 1.1],
      [2.5, 1.7, 1.1],
      [3, 1.8, 1.2],
    ],
  };
  for (const sex of ["male", "female"] as const)
    for (let i = 0; i < 4; i++) {
      const t = cutTargets({ ...profile, sex, frequency: i, weight: 100 });
      const [c, p, f] = expected[sex][i];
      assert.equal(t.training.c, Math.round(c * 100));
      assert.equal(t.training.p, Math.round(p * 100));
      assert.equal(t.training.f, Math.round(f * 100));
      assert.equal(t.light.c, Math.round(c * 70 * 10) / 10);
      assert.equal(t.rest.c, Math.round(c * 50 * 10) / 10);
      assert.equal(t.rest.p, t.training.p);
      assert.equal(t.rest.f, t.training.f);
    }
});
test("Numbers rounds components separately before summing kcal", () => {
  const t = cutTargets(profile);
  assert.deepEqual(t.training, { c: 220.5, p: 113.4, f: 63, kcal: 1903 });
  assert.deepEqual(t.light, { c: 154.4, p: 113.4, f: 63, kcal: 1639 });
  assert.deepEqual(t.rest, { c: 110.3, p: 113.4, f: 63, kcal: 1462 });
});
test("invalid inputs never fall through to the highest frequency or female coefficients", () => {
  assert.throws(() => cutTargets({ ...profile, frequency: 4 }));
  assert.throws(() => cutTargets({ ...profile, weight: NaN }));
  assert.throws(() => cutTargets({ ...profile, age: 17 }));
});
test("source strict speed thresholds and first-period differences", () => {
  assert.equal(cutReview(profile, true, 80, 78).direction, null);
  assert.equal(cutReview(profile, true, 80, 77.9).direction, "increase");
  assert.equal(cutReview(profile, false, 80, 78.4).direction, "increase");
  assert.equal(cutReview(profile, false, 80, 79.7).direction, null);
  assert.equal(cutReview(profile, false, 80, 79.8).direction, "decrease");
  assert.equal(
    cutReview({ ...profile, experiencedCut: false }, false, 80, 78.7).direction,
    "increase",
  );
  assert.deepEqual(
    cutReview({ ...profile, sex: "female", frequency: 0 }, true, 80, 77).range,
    [13, 23],
  );
  assert.deepEqual(cutReview(profile, true, 80, 80).range, [15, 25]);
});
test("Asia/Taipei day boundaries and calendar arithmetic", () => {
  assert.equal(
    dateInZone("Asia/Taipei", new Date("2026-10-09T16:00:00Z")),
    "2026-10-10",
  );
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});
test("meal corrections preserve original entries, totals include only latest", () => {
  const s = initialState();
  const m = {
    id: "a",
    date: "2026-10-09",
    slot: "午餐",
    name: "Test",
    quantity: 1,
    unit: "份",
    p: 10,
    c: 20,
    f: 5,
    kcal: 165,
    createdAt: "now",
  };
  s.meals.push(m, { ...m, id: "b", supersedes: "a", p: 20, kcal: 205 });
  assert.equal(s.meals.length, 2);
  assert.equal(mealTotals(s, m.date).p, 20);
  s.meals.push({ ...m, id: "c", supersedes: "b", deleted: true });
  assert.equal(mealTotals(s, m.date).kcal, 0);
});
test("weight correction excludes superseded point; missing dates are not invented", () => {
  const s = initialState();
  s.measurements.push(
    { id: "a", date: "2026-10-09", weight: 80, createdAt: "now" },
    {
      id: "b",
      date: "2026-10-09",
      weight: 79,
      supersedes: "a",
      createdAt: "now",
    },
  );
  assert.deepEqual(
    visibleMeasurements(s).map((m) => m.weight),
    [79],
  );
});
function withRec() {
  const s = initialState();
  s.profile = { ...profile };
  createInitialPlan(s, "2026-09-29", "v1", "now");
  s.measurements.push(
    { id: "a", date: "2026-09-29", weight: 80, createdAt: "now" },
    { id: "b", date: "2026-10-09", weight: 80, createdAt: "now" },
  );
  s.recommendations.push({
    id: "r",
    baseVersionId: "v1",
    createdAt: "now",
    periodStart: "2026-09-29",
    periodEnd: "2026-10-09",
    startWeight: 80,
    endWeight: 80,
    loss: 0,
    direction: "decrease",
    range: [15, 25],
    ruleId: "test",
    status: "pending",
  });
  return s;
}
test("Keep creates no new version and does not modify plan", () => {
  const s = withRec();
  const original = JSON.stringify(s.versions);
  decide(s, "r", "kept", 0, "2026-10-09", "v2", "now");
  assert.equal(JSON.stringify(s.versions), original);
  assert.equal(s.recommendations[0].status, "kept");
});
test("Accept is idempotent and changes tomorrow only, retaining pinned history", () => {
  const s = withRec();
  pinDay(s, "2026-10-09");
  const old = JSON.stringify(s.versions[0]);
  decide(s, "r", "accepted", 20, "2026-10-09", "v2", "now");
  decide(s, "r", "accepted", 20, "2026-10-09", "v3", "now");
  assert.equal(s.versions.length, 2);
  assert.equal(activePlan(s, "2026-10-09")?.id, "v1");
  assert.equal(activePlan(s, "2026-10-10")?.id, "v2");
  assert.equal(JSON.stringify(s.versions[0]), old);
  assert.equal(resolveDay(s, "2026-10-09").target?.c, 220.5);
  assert.equal(s.versions[1].targets.rest.c, 90.3);
});
test("stale measurement and out-of-range changes are rejected", () => {
  let s = withRec();
  assert.throws(() =>
    decide(s, "r", "accepted", 50, "2026-10-09", "v2", "now"),
  );
  s = withRec();
  s.measurements.push({
    id: "c",
    date: "2026-10-09",
    weight: 79,
    createdAt: "now",
    supersedes: "b",
  });
  assert.throws(() =>
    decide(s, "r", "accepted", 20, "2026-10-09", "v2", "now"),
  );
});
test("eligibility gate and zero vs missing water target", () => {
  const s = withRec();
  s.profile!.eligible = false;
  assert.throws(() =>
    decide(s, "r", "accepted", 20, "2026-10-09", "v2", "now"),
  );
  assert.equal(waterTotal(s, "2026-10-09"), 0);
  s.waters.push(
    { id: "w", date: "2026-10-09", ml: 250, createdAt: "now" },
    { id: "r", date: "2026-10-09", ml: -250, reverses: "w", createdAt: "now" },
  );
  assert.equal(waterTotal(s, "2026-10-09"), 0);
});
test("selected day type uses version in historical daily snapshot", () => {
  const s = withRec();
  pinDay(s, "2026-10-09");
  decide(s, "r", "accepted", 20, "2026-10-09", "v2", "now");
  setDayType(s, "2026-10-09", "rest");
  assert.equal(resolveDay(s, "2026-10-09").target?.c, 110.3);
});

test("confirming a plan attaches an existing unplanned diary to its targets", () => {
  const s = initialState();
  s.profile = { ...profile };
  pinDay(s, "2026-10-09");
  assert.equal(resolveDay(s, "2026-10-09").target, null);
  createInitialPlan(s, "2026-10-09", "v1", "now");
  assert.equal(resolveDay(s, "2026-10-09").target?.c, 220.5);
  assert.equal(s.days[0].versionId, "v1");
});
