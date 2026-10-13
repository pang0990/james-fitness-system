import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, initialState, validateState } from "../src/lib/domain";
import { stepsInRange,averageSteps,activityContext } from "../src/lib/activity";

function addSteps(state:ReturnType<typeof initialState>,date:string,steps:number) {
  (state.dailySteps??=[]).push({id:date,date,steps,source:"manual",updatedAt:date+"T08:00:00Z"});
}

test("Steps model is backwards-compatible with old local backups and historical cardio",()=>{
  const state=initialState();
  delete state.dailySteps;
  state.cardio.push({id:"old",date:"2026-10-11",type:"快走",minutes:25,calories:120,createdAt:"2026-10-11"});
  const restored=validateState(state);
  assert.equal(restored.dailySteps,undefined);
  assert.equal(restored.cardio[0].calories,120);
});

test("Missing days are missing, not zero; 7D and 30D use only recorded days",()=>{
  const state=initialState();
  addSteps(state,"2026-10-07",3000);
  addSteps(state,"2026-10-12",9000);
  addSteps(state,"2026-10-13",12000);
  const week=averageSteps(state,"2026-10-13",7);
  assert.equal(week.count,3);
  assert.equal(week.average,8000);
  assert.equal(stepsInRange(state,"2026-10-13",30).length,3);
});

test("Weekly activity comparison needs >=4 recorded days on both sides",()=>{
  const state=initialState();
  for(let i=0;i<3;i++)addSteps(state,addDays("2026-10-07",i),10000);
  for(let i=0;i<7;i++)addSteps(state,addDays("2026-10-13",-i),4500);
  assert.equal(activityContext(state,"2026-10-13").direction,"unknown");
  addSteps(state,"2026-10-10",10000);
  // No duplicate days: 10/10 belongs to the second week, so still unqualified.
  assert.equal(activityContext(state,"2026-10-13").direction,"unknown");
});

test("Steps are advisory only; explicit declines become context, not formula updates",()=>{
  const state=initialState();
  for(let i=0;i<7;i++){
    addSteps(state,addDays("2026-09-30",i),10000);
    addSteps(state,addDays("2026-10-07",i),4000);
  }
  const insight=activityContext(state,"2026-10-13");
  assert.equal(insight.direction,"down");
  assert.equal(insight.changePercent,-60);
  assert.equal(state.versions.length,0);
  assert.match(insight.message,/確認日常活動/);
});

test("Bad steps records are rejected without affecting nutrition formulas",()=>{
  const state=initialState();
  addSteps(state,"2026-10-13",9000);
  assert.equal(validateState(state).dailySteps?.[0]?.steps,9000);
  addSteps(state,"2026-10-13",8000);
  assert.throws(()=>validateState(state),/步數/);
  state.dailySteps![1].date="2026-10-12";
  state.dailySteps![1].steps=-1;
  assert.throws(()=>validateState(state),/步數/);
});
