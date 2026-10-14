import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, validateState, type Cycle, type Session } from "../src/lib/domain";
import { completeSession, pendingIds, nextDayIndex } from "../src/lib/training-queue";
import { cycleProgressEvents } from "../src/lib/training-model";

const stamp = "2026-10-14T08:00:00.000Z";
const done = "2026-10-14T09:00:00.000Z";
function fixture() {
  const state = initialState();
  const plan: Cycle = {
    id:"custom-cycle",name:"My Split",source:"custom",createdAt:stamp,round:1,
    days:[
      {id:"day-a",name:"上午上半身",exercises:[],
        secondSession:{name:"晚上核心",exercises:[{
          name:"核心動作",muscle:"Core",sets:3,reps:"12",rir:2,restSeconds:90,
          allowRestPause:false,allowDropSet:false,
        }]}},
      {id:"day-b",name:"下半身",exercises:[]},
    ],
    pending:["day-a","day-b"],
  };
  state.cycles = [plan];
  const main: Session = {
    id:"morning",date:"2026-10-14",name:"上午上半身",cycleId:plan.id,
    trainingDayId:"day-a",sessionPart:"main",status:"in_progress",
    exercises:[],createdAt:stamp,
  };
  state.sessions.push(main);
  return {state,plan,main};
}

test("custom Cycle day with an optional second workout validates and old records stay compatible",()=>{
  const {state}=fixture();
  assert.equal(validateState(state).cycles?.[0]?.days[0].secondSession?.name,"晚上核心");
  delete state.cycles![0].source;
  delete state.cycles![0].days[0].secondSession;
  assert.doesNotThrow(()=>validateState(state));
});

test("main workout consumes exactly one Cycle day; same-date second session never consumes another",()=>{
  const {state,plan,main}=fixture();
  completeSession(state,main,done);
  assert.deepEqual(pendingIds(state,plan),["day-b"]);
  assert.equal(nextDayIndex(state,plan),1);
  assert.equal(cycleProgressEvents(state,plan.id).length,1);
  const second:Session={
    id:"evening",date:"2026-10-14",name:"晚上核心",
    status:"in_progress",isExtra:true,sessionPart:"second",parentSessionId:main.id,
    cycleId:plan.id,trainingDayId:"day-a",createdAt:"2026-10-14T15:00:00.000Z",
    exercises:[],
  };
  state.sessions.push(second);
  completeSession(state,second,"2026-10-14T16:00:00.000Z");
  assert.deepEqual(pendingIds(state,plan),["day-b"]);
  assert.equal(cycleProgressEvents(state,plan.id).length,1);
  assert.equal(state.sessions.filter(s=>s.status==="completed"&&s.date==="2026-10-14").length,2);
  assert.notEqual(main.id,second.id);
  assert.equal(main.activeDuration,3600000);
  assert.equal(second.activeDuration,3600000);
  assert.doesNotThrow(()=>validateState(state));
});

test("one-off extra workout also leaves standard Cycle progression unchanged",()=>{
  const {state,plan}=fixture();
  state.sessions=[];
  const extra:Session={
    id:"ad-hoc",date:"2026-10-14",name:"下午有氧",
    status:"in_progress",isExtra:true,sessionPart:"extra",
    exercises:[],createdAt:stamp,
  };
  state.sessions.push(extra);
  completeSession(state,extra,done);
  assert.deepEqual(pendingIds(state,plan),["day-a","day-b"]);
  assert.equal(state.cycleEvents?.length,0);
});

test("older erroneously recorded extra completion events do not count as a Cycle day",()=>{
  const {state,plan,main}=fixture();
  completeSession(state,main,done);
  state.sessions.push({
    id:"old-extra",date:"2026-10-14",name:"舊版加練",status:"completed",
    isExtra:true,exercises:[],createdAt:stamp,completedAt:done,
  });
  state.cycleEvents!.push({
    id:"legacy",cycleId:plan.id,type:"completed",date:"2026-10-14",
    sessionId:"old-extra",trainingDayId:"day-a",
  });
  assert.equal(cycleProgressEvents(state,plan.id).length,1);
  assert.deepEqual(pendingIds(state,plan),["day-b"]);
});

test("two simultaneously running sessions remain invalid",()=>{
  const {state}=fixture();
  state.sessions.push({
    id:"second",date:"2026-10-14",name:"重複開啟",
    status:"in_progress",isExtra:true,exercises:[],createdAt:stamp,
  });
  assert.throws(()=>validateState(state),/多個進行中訓練/);
});

test("a planned second session must include a name and at least one exercise",()=>{
  const {state}=fixture();
  state.cycles![0].days[0].secondSession = {name:"未填完",exercises:[]};
  assert.throws(()=>validateState(state),/訓練計畫格式無效/);
});
