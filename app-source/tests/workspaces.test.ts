import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  type Cycle,
  type Session,
  validateState,
} from "../src/lib/domain";
import {
  pendingIds,
  consumeDay,
  completeSession,
} from "../src/lib/training-queue";
import { scheduleKind } from "../src/lib/training-model";
import { latestRecovery, painLevel } from "../src/lib/recovery";
const plan = (): Cycle => ({
  id: "p1",
  name: "Plan",
  days: ["Upper", "Lower", "Pull"].map((name, i) => ({ id: "d" + i, name })),
  createdAt: "2026-10-10T00:00:00Z",
});
const session = (): Session => ({
  id: "s1",
  name: "Pull",
  cycleId: "p1",
  trainingDayId: "d2",
  date: "2026-10-12",
  workoutDate: "2026-10-12",
  createdAt: "2026-10-12T15:30:00Z",
  status: "in_progress",
  exercises: [],
});
test("specific Pull removes Pull only; extra workout consumes nothing", () => {
  const s = initialState();
  s.cycles = [plan()];
  const workout = session();
  completeSession(s, workout, "2026-10-12T16:45:00Z");
  assert.deepEqual(pendingIds(s, s.cycles[0]), ["d0", "d1"]);
  const extra = { ...session(), isExtra: true };
  completeSession(s, extra, "2026-10-12T16:45:00Z");
  assert.deepEqual(pendingIds(s, s.cycles[0]), ["d0", "d1"]);
});
test("rest calendar and discarded session leave pending queue intact", () => {
  const s = initialState();
  s.cycles = [plan()];
  s.sessions = [{ ...session(), status: "discarded" }];
  s.schedule = [{ id: "r", date: "2026-10-12", kind: "rest", createdAt: "" }];
  assert.equal(scheduleKind(s, "2026-10-12"), "rest");
  assert.equal(pendingIds(s, s.cycles[0]).length, 3);
});
test("last day opens a new round; repeat consumption is prevented by session status", () => {
  const s = initialState();
  const p = plan();
  s.cycles = [p];
  p.pending = ["d2"];
  const w = session();
  completeSession(s, w, "2026-10-12T16:45:00Z");
  assert.equal(p.round, 2);
  assert.deepEqual(p.pending, ["d0", "d1", "d2"]);
  assert.throws(() => completeSession(s, w, "2026-10-12T16:45:00Z"));
});
test("completion keeps workout date over midnight and subtracts pause duration", () => {
  const s = initialState();
  s.cycles = [plan()];
  const w = { ...session(), pausedDuration: 900000 };
  completeSession(s, w, "2026-10-12T16:45:00Z");
  assert.equal(w.date, "2026-10-12");
  assert.equal(w.elapsedDuration, 4500000);
  assert.equal(w.activeDuration, 3600000);
});
test("latest independent recovery does not fabricate missing values and keeps areas separate", () => {
  const s = initialState();
  s.recoveryEntries = [
    { id: "a", date: "2026-10-12", type: "fatigue", value: 2, createdAt: "a" },
    { id: "b", date: "2026-10-12", type: "fatigue", value: 3, createdAt: "b" },
    {
      id: "c",
      date: "2026-10-12",
      type: "soreness",
      value: 2,
      area: "Quads",
      side: "Left",
      createdAt: "c",
    },
    {
      id: "d",
      date: "2026-10-12",
      type: "soreness",
      value: 1,
      area: "Quads",
      side: "Right",
      createdAt: "d",
    },
  ];
  assert.equal(latestRecovery(s, "2026-10-12").length, 3);
  assert.equal(latestRecovery(s, "2026-10-12")[0].value, 3);
  assert.equal(
    latestRecovery(s, "2026-10-12").some((r) => r.type === "sleep"),
    false,
  );
});
test("pain symptom flags take priority over score", () => {
  assert.equal(painLevel(1, ["red"]), 4);
  assert.equal(painLevel(1, ["sharp"]), 3);
  assert.equal(painLevel(4, []), 2);
});
test("legacy backups without new optional fields remain readable", () => {
  const s = initialState();
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))), s);
});
test("single date overrides batch, clearing reveals batch, weekly fills other dates", () => {
  const s = initialState();
  s.weeklySchedule = [1];
  s.schedule = [
    {
      id: "a",
      date: "2026-10-12",
      kind: "rest",
      source: "batch",
      createdAt: "",
    },
    {
      id: "b",
      date: "2026-10-12",
      kind: "train",
      source: "single",
      createdAt: "",
    },
  ];
  assert.equal(scheduleKind(s, "2026-10-12"), "train");
  s.schedule.push({
    id: "c",
    date: "2026-10-12",
    kind: "train",
    cleared: true,
    createdAt: "",
  });
  assert.equal(scheduleKind(s, "2026-10-12"), "rest");
  assert.equal(scheduleKind(s, "2026-10-19"), "train");
});
