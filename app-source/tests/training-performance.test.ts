import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../src/lib/domain";
import {
  crossCyclePerformance,
  estimate1RM,
  exercisePerformanceHistory,
} from "../src/lib/training-model";
import { trainingTemplates } from "../src/lib/training-templates";

test("e1RM is stable and cross-cycle comparison detects progression", () => {
  const s = initialState();
  s.sessions.push(
    {
      id: "s1",
      date: "2026-09-01",
      name: "Upper A",
      status: "completed",
      cycleId: "c1",
      createdAt: "2026-09-01T10:00:00Z",
      completedAt: "2026-09-01T11:00:00Z",
      exercises: [
        {
          id: "e1",
          name: "Barbell Bench Press",
          sets: [
            {
              id: "set1",
              weight: 80,
              reps: 8,
              rir: 2,
              type: "working",
              createdAt: "2026-09-01T10:20:00Z",
            },
          ],
        },
      ],
    },
    {
      id: "s2",
      date: "2026-10-01",
      name: "Upper A",
      status: "completed",
      cycleId: "c2",
      createdAt: "2026-10-01T10:00:00Z",
      completedAt: "2026-10-01T11:00:00Z",
      exercises: [
        {
          id: "e2",
          name: "Barbell Bench Press",
          sets: [
            {
              id: "set2",
              weight: 82.5,
              reps: 8,
              rir: 2,
              type: "working",
              createdAt: "2026-10-01T10:20:00Z",
            },
          ],
        },
      ],
    },
  );

  assert.equal(estimate1RM(80, 8), 101.33);
  const history = exercisePerformanceHistory(s);
  assert.equal(history[0].name, "Barbell Bench Press");
  assert.equal(history[0].improved, true);

  const result = crossCyclePerformance(s);
  assert.equal(result.previousCycleId, "c1");
  assert.equal(result.currentCycleId, "c2");
  assert.equal(result.comparable, 1);
  assert.equal(result.improved, 1);
});

test("default training templates are optional day presets, not a required split", () => {
  const ids = trainingTemplates.map((t) => t.id);
  assert.deepEqual(ids, ["upper-lower", "ppl", "five-day", "blank"]);
  const upperLower = trainingTemplates.find((t) => t.id === "upper-lower")!;
  assert.equal(upperLower.days.length, 4);
  assert.ok(upperLower.days.every((d) => d.exercises.length > 0));
  assert.equal(trainingTemplates.find((t) => t.id === "blank")!.days.length, 0);
});
