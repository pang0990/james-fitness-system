import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, validateState, type AppState } from "../src/lib/domain";
import {
  cycleDayId, cyclePendingIds, cycleNextDayIndex,
  finishTrainingSession, countedCycleEvents,
} from "../src/lib/training-core/cycle-transitions";
import { completeSession, pendingIds, dayId, nextDayIndex } from "../src/lib/training-queue";

function fixture(): AppState {
  const state=initialState();
  state.cycles=[{
    id:"plan-core",name:"Portable Cycle",round:1,
    createdAt:"2026-10-22T01:00:00.000Z",
    pending:["day-1","day-2"],
    days:[{id:"day-1",name:"Upper"},{id:"day-2",name:"Lower"}],
  }];
  state.sessions=[{
    id:"session-core",date:"2026-10-22",name:"Upper",status:"in_progress",
    cycleId:"plan-core",trainingDayId:"day-1",cycleDayIndex:0,round:1,
    createdAt:"2026-10-22T02:00:00.000Z",exercises:[],
  }];
  return state;
}
test("portable Cycle API preserves legacy queue and day mapping", () => {
  const state=fixture(), plan=state.cycles![0];
  assert.equal(cycleDayId(plan,1),dayId(plan,1));
  assert.deepEqual(cyclePendingIds(state,plan),pendingIds(state,plan));
  assert.equal(cycleNextDayIndex(state,plan),nextDayIndex(state,plan));
});
test("portable completion is byte-for-byte equivalent to existing Web adapter", () => {
  const portable=fixture(), legacy=fixture();
  const now="2026-10-22T03:00:00.000Z";
  finishTrainingSession(portable,portable.sessions[0],now,{eventId:()=>"stable-event"});
  completeSession(legacy,legacy.sessions[0],now,{eventId:()=>"stable-event"});
  assert.deepEqual(portable,legacy);
  assert.equal(portable.sessions[0].cycleCounted,true);
  assert.deepEqual(portable.cycles![0].pending,["day-2"]);
  assert.equal(countedCycleEvents(portable,"plan-core").length,1);
  validateState(portable);
});
test("portable core rejects stale Cycle rounds and duplicate completion", () => {
  const state=fixture();
  state.cycles![0].round=2;
  finishTrainingSession(state,state.sessions[0],"2026-10-22T03:00:00.000Z",
    {eventId:()=>{throw Error("Must not generate event ID for an uncounted session");}});
  assert.equal(state.sessions[0].cycleCounted,false);
  assert.equal(state.cycleEvents?.length,0);
  assert.deepEqual(state.cycles![0].pending,["day-1","day-2"]);
  assert.throws(()=>finishTrainingSession(state,state.sessions[0],"2026-10-22T04:00:00.000Z",
    {eventId:()=>"second"}),/已結束/);
});
test("portable Cycle source uses no browser IDs, React, Supabase or Next.js", async () => {
  const { readFileSync } = await import("node:fs");
  const content = readFileSync(new URL("../src/lib/training-core/cycle-transitions.ts", import.meta.url),"utf8");
  const executable = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.doesNotMatch(executable,/\b(window|document|localStorage|indexedDB|crypto\.randomUUID|React|supabase)\b/);
});
