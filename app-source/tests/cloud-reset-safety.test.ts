import test from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../src/lib/domain";
import { decideCloudSync } from "../src/lib/cloud-sync";

test("clearing local copy then reconnecting downloads the existing cloud backup", () => {
  const remote = { cloudRevision: 12, state: { ...initialState(), revision: 30 } };
  assert.equal(decideCloudSync(null, remote, null), "download");
});

test("new offline edits after local clearing cannot silently erase cloud data", () => {
  const remote = { cloudRevision: 12, state: { ...initialState(), revision: 30 } };
  const local = { ...initialState(), revision: 1 };
  assert.equal(decideCloudSync(local, remote, null), "conflict");
});
