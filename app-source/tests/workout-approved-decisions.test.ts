import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, type Cycle, type Session } from "../src/lib/domain";
import { completeSession, pendingIds } from "../src/lib/training-queue";
import { startRestInterval, endRestInterval } from "../src/lib/rest-intervals";
import { correctCompletedSet } from "../src/lib/workout-sets";
import { cycleProgressEvents } from "../src/lib/training-model";
import { exerciseLibrary } from "../src/lib/exercise-library";

function fixture() {
 const state=initialState();
 const cycle:Cycle={id:"cycle-x",name:"自訂",createdAt:"2026-10-17T08:00:00Z",
  days:[{id:"d1",name:"胸",exercises:[{name:"Chest Press",muscle:"Chest",
    sets:3,reps:"8-12",restSeconds:120,allowRestPause:true,allowDropSet:true}]},
    {id:"d2",name:"腿",exercises:[]}],pending:["d1","d2"]};
 state.cycles=[cycle];
 const session:Session={id:"sess-x",date:"2026-10-17",name:"胸",createdAt:"2026-10-17T09:00:00Z",
  status:"in_progress",cycleId:"cycle-x",trainingDayId:"d1",
  exercises:[{id:"ex",name:"Chest Press",plannedSets:3,sets:[{
    id:"set1",type:"working",weight:80,reps:10,rir:null,
    createdAt:"2026-10-17T09:15:00Z"}]}]};
 state.sessions=[session];
 return {state,cycle,session};
}
test("user can save an incomplete session without consuming the pending Cycle day",()=>{
 const {state,cycle,session}=fixture();
 completeSession(state,session,"2026-10-17T10:00:00Z",{countTowardCycle:false});
 assert.equal(session.status,"completed");
 assert.equal(session.cycleCounted,false);
 assert.deepEqual(pendingIds(state,cycle),["d1","d2"]);
 assert.equal(cycleProgressEvents(state,cycle.id).length,0);
 assert.equal(state.cycleEvents?.length??0,0);
});
test("user can explicitly count an incomplete session as a completed Cycle day",()=>{
 const {state,cycle,session}=fixture();
 completeSession(state,session,"2026-10-17T10:00:00Z",{countTowardCycle:true});
 assert.equal(session.cycleCounted,true);
 assert.deepEqual(pendingIds(state,cycle),["d2"]);
 assert.equal(cycleProgressEvents(state,cycle.id).length,1);
});
test("RP short rest defaults to 20 seconds and does not overlap standard timer",()=>{
 const {session}=fixture();
 assert.equal(startRestInterval(session,"standard","2026-10-17T09:16:00Z",120),true);
 assert.equal(startRestInterval(session,"rp","2026-10-17T09:17:00Z",20),true);
 assert.equal(session.restStartedAt,undefined);
 assert.equal(session.restHistory?.[0].elapsedSeconds,60);
 assert.equal(session.rpRestTargetSeconds,20);
 assert.equal(startRestInterval(session,"rp","2026-10-17T09:17:01Z",20),false);
 endRestInterval(session,"rp","2026-10-17T09:17:31Z");
 assert.equal(session.rpRestHistory?.[0].elapsedSeconds,31);
 assert.equal(session.rpRestHistory?.[0].targetSeconds,20);
});
test("RP clock is pause-safe and can be resumed by shifting start timestamp",()=>{
 const {session}=fixture();
 startRestInterval(session,"rp","2026-10-17T09:00:00Z",20);
 session.pausedAt="2026-10-17T09:00:07Z";
 // While paused, only 7 seconds of active time count.
 endRestInterval(session,"rp","2026-10-17T09:01:00Z");
 assert.equal(session.rpRestHistory?.[0].elapsedSeconds,7);
});
test("historic set corrections append audit and do not modify a Cycle prescription",()=>{
 const {state,session,cycle}=fixture();
 completeSession(state,session,"2026-10-17T10:00:00Z");
 const changed=correctCompletedSet(session,"ex","set1",{
   weight:82.5,reps:9,type:"working",
 },"2026-10-17T11:00:00Z","audit-1");
 assert.equal(changed,true);
 assert.equal(session.exercises[0].sets[0].weight,82.5);
 assert.equal(session.setCorrections?.length,1);
 assert.equal(session.setCorrections?.[0].before.weight,80);
 assert.equal(session.setCorrections?.[0].after.reps,9);
 assert.equal(cycle.days[0].exercises![0].sets,3);
 assert.equal(correctCompletedSet(session,"ex","set1",{
   weight:82.5,reps:9,type:"working",
 },"2026-10-17T11:01:00Z","audit-2"),false);
 assert.equal(session.setCorrections?.length,1);
});
test("public JFS exercises and private personal exercises have separate visibility",()=>{
 const state=initialState();
 state.customExercises=[{id:"my-machine",name:"器械平胸推",brand:"Newtech",
   equipment:"Machine",muscle:"Chest",usage:"training",
   allowRestPause:true,allowDropSet:false,createdAt:"2026-10-17T00:00:00Z"}];
 const library=exerciseLibrary(state);
 assert.equal(library.find(x=>x.id==="my-machine")?.visibility,"private");
 assert.equal(library.find(x=>x.source==="jfs")?.visibility,"public");
});
