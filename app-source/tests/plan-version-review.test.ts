import assert from "node:assert/strict";
import test from "node:test";
import { reordered,versionReview } from "../src/lib/plan-version-review";
import { remainingWorkingSets } from "../src/lib/training-overview";
import { trainingFixture,segment } from "./fixtures/training-v3";

test("extra work on one exercise cannot complete another exercise's target",()=>{
  const session=trainingFixture().sessions[1];
  session.exercises[0].sets=Array.from({length:6},(_,i)=>segment(String(i)));
  assert.equal(remainingWorkingSets(session),3);
});
test("version review preserves valid IDs and flags retired calendar dates without mutating snapshots",()=>{
  const state=trainingFixture(), plan=state.cycles![0], date="2026-11-19";
  state.schedule=[{id:"one",date,createdAt:date+"T10:00:00Z",kind:"train",trainingDayId:"day-a"}];
  plan.pending=["day-b"];
  const original=structuredClone(state);
  const result=versionReview(state,[plan.days[1],{id:"new",name:"C"}],date);
  assert.deepEqual(result.pending,["day-b","new"]);
  assert.deepEqual(result.affected,[date]);
  assert.deepEqual(versionReview(state,plan.days,date).affected,[]);
  assert.deepEqual(state,original);
});
test("reordering a second session modifies only its supplied list",()=>{
  const main=["chest","row"], second=["curl","press"];
  assert.deepEqual(reordered(second,1,0),["press","curl"]);
  assert.deepEqual(main,["chest","row"]);
  assert.deepEqual(second,["curl","press"]);
});
