import { test } from "node:test";
import assert from "node:assert/strict";
import { validateState } from "../src/lib/domain";
import {
  appendWorkoutSet,
  previousWorkingSets,
  removeWorkoutSet,
} from "../src/lib/workout-sets";
import { completeSession } from "../src/lib/training-queue";
import { trainingFixture, segment, testTime } from "./fixtures/training-v3";

test("backup roundtrip preserves legacy RIR, unknown fields, Cycle, draft and session exactly", () => {
  const s = trainingFixture();
  Object.assign(s.sessions[0], { legacyMetadata: { preserved: true } });
  s.sessions[1].setDrafts = {
    "ex-a": {
      id: "draft",
      type: "drop",
      weight: "45",
      reps: "",
      parentId: "",
      updatedAt: testTime,
    },
  };
  const json = JSON.stringify(s);
  assert.equal(JSON.stringify(validateState(JSON.parse(json))), json);
});
for (const [name, mutate] of Object.entries({
  "negative weight": (s: any): void => {
    s.sessions[1].exercises[0].sets.push({ ...segment(), weight: -1 });
  },
  "fractional reps": (s: any): void => {
    s.sessions[1].exercises[0].sets.push({ ...segment(), reps: 1.5 });
  },
  "infinite weight": (s: any): void => {
    s.sessions[1].exercises[0].sets.push({ ...segment(), weight: Infinity });
  },
  "unknown type": (s: any): void => {
    s.sessions[1].exercises[0].sets.push({ ...segment(), type: "bad" });
  },
  "bad timestamp": (s: any): void => {
    s.sessions[1].createdAt = "bad";
  },
  "duplicate set": (s: any): void => {
    s.sessions[1].exercises[0].sets.push(segment(), segment());
  },
  "duplicate session": (s: any): void => {
    s.sessions.push(structuredClone(s.sessions[0]));
  },
  "duplicate exercise": (s: any): void => {
    s.sessions[1].exercises.push(structuredClone(s.sessions[1].exercises[0]));
  },
  "orphan child": (s: any): void => {
    s.sessions[1].exercises[0].sets.push({
      ...segment(),
      type: "rp",
      parentId: "missing",
    });
  },
  "cross exercise parent": (s: any): void => {
    s.sessions[1].exercises[1].sets.push(segment());
    s.sessions[1].exercises[0].sets.push({
      ...segment("child"),
      type: "drop",
      parentId: "set-1",
    });
  },
  "invalid queue": (s: any): void => {
    s.cycles[0].pending = ["missing"];
  },
  "duplicate queue": (s: any): void => {
    s.cycles[0].pending = ["day-a", "day-a"];
  },
  "malformed exercises": (s: any): void => {
    s.sessions[1].exercises = null;
  },
  "invalid draft": (s: any): void => {
    s.sessions[1].setDrafts = { "ex-a": { id: "draft", weight: 4 } };
  },
}))
  test(`reject ${name} without mutating input`, () => {
    const s = trainingFixture();
    mutate(s);
    const before = structuredClone(s);
    assert.throws(() => validateState(s));
    assert.deepEqual(s, before);
  });

test("same submission retries are idempotent before and after removal/reload", () => {
  const s = trainingFixture();
  const session = s.sessions[1];
  assert.equal(appendWorkoutSet(session, "ex-a", segment()), true);
  assert.equal(appendWorkoutSet(session, "ex-a", segment()), false);
  session.exercises[0].sets = removeWorkoutSet(
    session.exercises[0].sets,
    "set-1",
  ).remaining;
  const restored = validateState(JSON.parse(JSON.stringify(s)));
  assert.equal(
    appendWorkoutSet(restored.sessions[1], "ex-a", segment()),
    false,
  );
  assert.equal(restored.sessions[1].exercises[0].sets.length, 0);
});
test("stable IDs survive rename and distinguish same-name equipment; legacy name fallback remains", () => {
  const s = trainingFixture();
  const ex = s.sessions[1].exercises[0];
  assert.equal(previousWorkingSets(s.sessions, ex)?.[0].weight, 60);
  assert.equal(
    previousWorkingSets(s.sessions, { ...ex, exerciseLibraryId: "other" }),
    undefined,
  );
  delete s.sessions[0].exercises[0].exerciseLibraryId;
  assert.equal(
    previousWorkingSets(s.sessions, {
      ...ex,
      exerciseLibraryId: undefined,
      name: "改名前的胸推",
    })?.length,
    1,
  );
});
test("pause and completed sessions reject new operations", () => {
  const s = trainingFixture().sessions[1];
  s.pausedAt = testTime;
  assert.throws(() => appendWorkoutSet(s, "ex-a", segment()));
  delete s.pausedAt;
  s.status = "completed";
  assert.throws(() => appendWorkoutSet(s, "ex-a", segment()));
});
for (const count of [true, false])
  test(`completion decision ${count} survives backup with exactly one event`, () => {
    const s = trainingFixture();
    completeSession(s, s.sessions[1], new Date().toISOString(), {
      countTowardCycle: count,
    });
    const restored = validateState(JSON.parse(JSON.stringify(s)));
    assert.equal(restored.cycleEvents?.length, count ? 1 : 0);
    assert.deepEqual(
      restored.cycles?.[0].pending,
      count ? ["day-b"] : ["day-a", "day-b"],
    );
    assert.throws(() =>
      completeSession(restored, restored.sessions[1], testTime),
    );
  });

test("completion updates original Cycle even when a different Cycle is newest", () => {
  const s = trainingFixture();
  s.cycles!.push({ ...structuredClone(s.cycles![0]), id: "new-cycle" });
  completeSession(s, s.sessions[1], new Date().toISOString());
  assert.deepEqual(s.cycles![0].pending, ["day-b"]);
  assert.deepEqual(s.cycles![1].pending, ["day-a", "day-b"]);
});
