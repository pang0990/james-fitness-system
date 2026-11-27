import test from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../src/lib/domain";
import { decideCloudSync, readCloudMeta } from "../src/lib/cloud-sync";

const base = initialState();
const changed = { ...base, revision: base.revision + 1 };
const remote = { cloudRevision: 5, state: base };

test("first signed-in device uploads its scoped local records", () => {
  assert.equal(decideCloudSync(base, null, null), "upload");
  assert.equal(decideCloudSync(null, null, null), "synced");
});
test("fresh device downloads account snapshot; unchanged device is synchronized", () => {
  assert.equal(decideCloudSync(null, remote, null), "download");
  assert.equal(decideCloudSync(base, remote, { cloudRevision: 5, localRevision: base.revision }), "synced");
});
test("local edits upload by CAS only when cloud version matches", () => {
  assert.equal(decideCloudSync(changed, remote, { cloudRevision: 5, localRevision: base.revision }), "upload");
});
test("diverged devices are never silently overwritten", () => {
  assert.equal(decideCloudSync(changed, { cloudRevision: 6, state: base }, { cloudRevision: 5, localRevision: base.revision }), "conflict");
  assert.equal(decideCloudSync(base, null, { cloudRevision: 5, localRevision: base.revision }), "conflict");
  assert.equal(decideCloudSync(base, remote, null), "synced");
});
test("local metadata is account-agnostic input validated before use", () => {
  assert.equal(readCloudMeta('{"cloudRevision":5,"localRevision":1}')?.cloudRevision, 5);
  assert.equal(readCloudMeta('{"cloudRevision":-4,"localRevision":1}'), null);
  assert.equal(readCloudMeta("{broken"), null);
});
