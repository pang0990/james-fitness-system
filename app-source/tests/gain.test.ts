import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, addDays, type AppState } from "../src/lib/domain";
import { gainReview, applyGainDecision } from "../src/lib/gain";
import { activeCycle, performance } from "../src/lib/training-model";
function fixture() {
  const s = initialState();
  s.profile = {
    name: "Test",
    age: 30,
    height: 180,
    weight: 80,
    sex: "male",
    frequency: 3,
    experiencedCut: false,
    goal: "GAIN",
    eligible: true,
    timezone: "Asia/Taipei",
    waterTarget: 2500,
  };
  s.gainSettings = {
    level: "intermediate",
    proteinFatConfirmed: true,
    startCarbsConfirmed: true,
    adherenceConfirmed: true,
    recoveryConfirmed: true,
  };
  for (let i = 0; i < 14; i++) {
    const date = addDays("2026-09-01", i);
    s.measurements.push({ id: "w" + i, date, weight: 80, createdAt: date });
    s.days.push({
      date,
      dayType: "training",
      versionId: null,
      target: null,
      complete: true,
    });
    s.meals.push({
      id: "m" + i,
      date,
      slot: "Breakfast",
      name: "Food",
      quantity: 1,
      unit: "portion",
      p: 160,
      c: 240,
      f: 70,
      kcal: 2230,
      createdAt: date,
    });
  }
  s.sessions.push({
    id: "s1",
    date: "2026-09-07",
    name: "Training",
    status: "completed",
    createdAt: "x",
    exercises: [
      {
        id: "e",
        name: "Bench",
        sets: [
          {
            id: "t",
            weight: 80,
            reps: 8,
            rir: 2,
            type: "working",
            createdAt: "x",
          },
        ],
      },
    ],
  });
  return s;
}
test("GAIN baseline uses averages, requires balanced weeks, proposes +1g/kg", () => {
  const s = fixture();
  const r = gainReview(s, "2026-09-14");
  assert.equal(r.delta, 80);
  assert.equal(r.baseline.c, 240);
  assert.equal(r.kind, "gain-start");
  s.measurements = s.measurements.slice(0, 9);
  assert.equal(gainReview(s, "2026-09-14").actionable, false);
});
test("GAIN accept tomorrow, frozen baseline, no duplicate and keep no version", () => {
  const s = fixture(),
    r = gainReview(s, "2026-09-14");
  applyGainDecision(s, "2026-09-14", true, JSON.stringify(r));
  assert.equal(s.versions[0].targets.training.c, 320);
  assert.equal(s.versions[0].targets.training.p, 160);
  assert.equal(s.versions[0].effectiveDate, "2026-09-15");
  assert.equal(s.days[0].target, null);
  assert.throws(() =>
    applyGainDecision(s, "2026-09-14", true, JSON.stringify(r)),
  );
  const k = fixture();
  applyGainDecision(
    k,
    "2026-09-14",
    false,
    JSON.stringify(gainReview(k, "2026-09-14")),
  );
  assert.equal(k.versions.length, 0);
  assert.equal(k.gainDecisions?.[0].status, "kept");
});
test("GAIN data mutation invalidates preview", () => {
  const s = fixture(),
    r = gainReview(s, "2026-09-14");
  s.measurements[13].weight = 82;
  assert.throws(() =>
    applyGainDecision(s, "2026-09-14", true, JSON.stringify(r)),
  );
});
test("GAIN improving performance keeps observed baseline", () => {
  const s = fixture();
  const copy = structuredClone(s.sessions[0]);
  copy.id = "s2";
  copy.date = "2026-09-14";
  copy.exercises[0].sets[0].reps = 10;
  s.sessions.push(copy);
  assert.equal(gainReview(s, "2026-09-14").delta, 0);
  assert.equal(gainReview(s, "2026-09-14").kind, "baseline");
});
test("training version activates only at cycle boundary after session completion", () => {
  const s = fixture();
  s.cycles = [
    {
      id: "old",
      name: "PPL",
      days: [{ name: "Push" }, { name: "Pull" }, { name: "Legs" }],
      createdAt: "x",
    },
    {
      id: "new",
      name: "PPL",
      days: [{ name: "Push" }],
      createdAt: "x",
      activateAfter: { cycleId: "old", eventCount: 3 },
    },
  ];
  assert.equal(activeCycle(s)?.id, "old");
  s.cycleEvents = [0, 1, 2].map((i) => ({
    id: String(i),
    cycleId: "old",
    type: "completed",
    date: "x",
  }));
  assert.equal(activeCycle(s)?.id, "new");
});
test("GAIN adjustment requires adherence and recovery, keeps P/F unchanged", () => {
  const s = fixture();
  s.versions.push({
    id: "base",
    number: 1,
    createdAt: "2026-09-01",
    effectiveDate: "2026-09-01",
    previousId: null,
    ruleId: "james-gain-v1.0",
    inputs: s.profile!,
    targets: {
      training: { p: 160, c: 300, f: 70, kcal: 2470 },
      light: { p: 160, c: 300, f: 70, kcal: 2470 },
      rest: { p: 160, c: 300, f: 70, kcal: 2470 },
    },
    reason: "Baseline",
  });
  const session = structuredClone(s.sessions[0]);
  session.id = "s2";
  session.date = "2026-09-14";
  s.sessions.push(session);
  let r = gainReview(s, "2026-09-14");
  assert.equal(r.delta, 25);
  s.gainSettings!.recoveryConfirmed = false;
  assert.equal(gainReview(s, "2026-09-14").actionable, false);
  s.gainSettings!.recoveryConfirmed = true;
  applyGainDecision(s, "2026-09-14", true, JSON.stringify(r));
  assert.equal(s.versions[1].targets.training.c, 325);
  assert.equal(s.versions[1].targets.training.f, 70);
  assert.equal(s.versions[0].targets.training.c, 300);
  assert.equal(s.gainSettings!.recoveryConfirmed, false);
});
