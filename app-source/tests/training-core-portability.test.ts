import { test } from "node:test";
import assert from "node:assert/strict";
import * as core from "../src/lib/training-core";
import { appendWorkoutSet as webAppend } from "../src/lib/workout-sets";
import { validateTrainingSessions as webValidate } from "../src/lib/training-validation";
import { startRestInterval as webStartRest } from "../src/lib/rest-intervals";
import { trainingFixture, segment, testTime } from "./fixtures/training-v3";

test("Web compatibility imports use the same shared Training Core implementation", () => {
  assert.equal(webAppend, core.appendWorkoutSet);
  assert.equal(webValidate, core.validateTrainingSessions);
  assert.equal(webStartRest, core.startRestInterval);
});

test("shared core validates sessions without rewriting legacy records", () => {
  const data = trainingFixture();
  const before = JSON.stringify(data.sessions);
  core.validateTrainingSessions(data.sessions);
  assert.equal(JSON.stringify(data.sessions), before);
  core.validateCycleIntegrity(data.cycles, data.cycleEvents ?? []);
});

test("shared core rejects invalid sets without mutating an in-progress session", () => {
  const session = trainingFixture().sessions[1];
  const before = structuredClone(session);
  assert.throws(() => core.appendWorkoutSet(session, "ex-a", { ...segment(), weight: -10 }));
  assert.deepEqual(session, before);
});

test("shared core keeps a submission ID after an undo and a retry", () => {
  const session = trainingFixture().sessions[1];
  assert.equal(core.appendWorkoutSet(session, "ex-a", segment()), true);
  const removed = core.removeWorkoutSet(session.exercises[0].sets, "set-1");
  session.exercises[0].sets = removed.remaining;
  assert.equal(core.appendWorkoutSet(session, "ex-a", segment()), false);
  assert.deepEqual(session.setSubmissionIds, ["set-1"]);
});

test("shared core rest interval has deterministic start and end inputs", () => {
  const session = trainingFixture().sessions[1];
  assert.equal(core.startRestInterval(session, "standard", testTime, 120), true);
  assert.equal(core.endRestInterval(session, "standard", "2026-10-21T02:01:00.000Z"), true);
  assert.deepEqual(session.restHistory, [{
    startedAt: testTime,
    endedAt: "2026-10-21T02:01:00.000Z",
    elapsedSeconds: 60,
    targetSeconds: 120,
  }]);
});
