import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, initialState, type AppState } from "../src/lib/domain";
import { applyGainDecision, gainReview } from "../src/lib/gain";
import { GAIN_TEMP_RULE } from "../src/lib/onboarding";

function fixture(): AppState {
  const s=initialState();
  s.profile={name:"Test",age:30,height:180,weight:80,sex:"male",frequency:2,
    experiencedCut:false,goal:"GAIN",eligible:true,timezone:"Asia/Taipei",waterTarget:0,
    resistanceDays:3};
  s.weeklySchedule=[1,3,5];
  s.versions.push({id:"temp",number:1,createdAt:"2026-09-01",effectiveDate:"2026-09-01",
    previousId:null,ruleId:GAIN_TEMP_RULE,inputs:structuredClone(s.profile),
    targets:{
      training:{p:144,c:516,f:80,kcal:3360},
      light:{p:144,c:516,f:80,kcal:3360},
      rest:{p:144,c:516,f:80,kcal:3360},
    },reason:"Temporary"});
  for(let i=0;i<14;i++){
    const date=addDays("2026-09-01",i);
    s.measurements.push({id:"w"+i,date,weight:80,createdAt:date});
    s.days.push({date,dayType:"training",versionId:"temp",target:s.versions[0].targets.training,complete:true});
    s.meals.push({id:"m"+i,date,slot:"早餐",name:"Recorded",quantity:1,unit:"份",p:150,c:350,f:70,kcal:2600,createdAt:date});
    const weekday=new Date(date+"T12:00:00Z").getUTCDay();
    if([1,3,5].includes(weekday))s.sessions.push({id:"session"+i,date,name:"Upper",status:"completed",createdAt:date,exercises:[]});
  }
  return s;
}
test("GAIN temporary can turn into individualized baseline only with 14-day qualified data",()=>{
  const s=fixture();
  const r=gainReview(s,"2026-09-14");
  assert.equal(r.kind,"temporary-baseline");
  assert.equal(r.actionable,true);
  assert.equal(r.baseline.c,350);
  applyGainDecision(s,"2026-09-14",true,JSON.stringify(r));
  assert.equal(s.versions.length,2);
  assert.equal(s.versions[0].ruleId,GAIN_TEMP_RULE);
  assert.equal(s.versions[1].ruleId,"james-gain-v1.0");
  assert.equal(s.versions[1].effectiveDate,"2026-09-15");
  assert.equal(s.versions[1].targets.training.c,350,"actual recorded baseline replaces provisional carb value");
  assert.equal(s.versions[0].targets.training.c,516,"historical plan remains immutable");
});
test("GAIN temporary stays as-is with inadequate training, absent schedule or pain hold",()=>{
  const s=fixture();
  s.sessions=s.sessions.slice(0,3);
  assert.equal(gainReview(s,"2026-09-14").actionable,false);
  const noSchedule=fixture();noSchedule.weeklySchedule=undefined;
  assert.equal(gainReview(noSchedule,"2026-09-14").actionable,false);
  const pain=fixture();pain.recoveryEntries=[{id:"pain",date:"2026-09-14",type:"pain",value:7,unit:"rating",createdAt:"x"}];
  assert.equal(gainReview(pain,"2026-09-14").actionable,false);
});


test("GAIN baseline review records major step shifts and requires acknowledgement only with enough data",()=>{
  const s=fixture();
  for(let i=0;i<14;i++){
    const date=addDays("2026-09-01",i);
    s.dailySteps!.push({id:"step"+i,date,steps:i<7?10000:4500,source:"manual",updatedAt:date});
  }
  const review=gainReview(s,"2026-09-14");
  assert.equal(review.actionable,true);
  assert.equal(review.activityEvidence.significant,true);
  const expected=JSON.stringify(review);
  assert.throws(()=>applyGainDecision(s,"2026-09-14",true,expected),/活動量/);
  assert.equal(s.versions.length,1);
  applyGainDecision(s,"2026-09-14",true,expected,true);
  assert.equal(s.versions.length,2);
  assert.equal(s.gainDecisions?.[0].activityEvidence?.changePercent,-55);
  assert.equal(s.gainDecisions?.[0].activityAcknowledged,true);
});
