import {test} from "node:test";
import assert from "node:assert/strict";
import {initialState,validateState,type Session,type Cycle} from "../src/lib/domain";
import {performance} from "../src/lib/training-model";
import {completeSession} from "../src/lib/training-queue";
import {exerciseLibrary,searchExercises} from "../src/lib/exercise-library";

test("RIR is not required in new plans, but historical RIR values remain valid",()=>{
  const s=initialState();
  const cycle:Cycle={id:"c1",name:"自訂",source:"custom",createdAt:"2026-10-17T01:00:00Z",
    days:[{id:"a",name:"胸",exercises:[{name:"Chest Press",muscle:"Chest",sets:3,reps:"10",
      restSeconds:120,allowRestPause:true,allowDropSet:true}]}]};
  s.cycles=[cycle];
  assert.doesNotThrow(()=>validateState(s));
  cycle.days[0].exercises![0].rir=9;
  assert.doesNotThrow(()=>validateState(s));
});

test("performance tracks weight/reps independent of old RIR",()=>{
  const s=initialState();
  const make=(id:string,date:string,weight:number,reps:number,rir:number|null):Session=>({
    id,date,name:"胸",createdAt:date+"T10:00:00Z",
    status:"completed",exercises:[{id:"x-"+id,name:"Chest Press",
      sets:[{id:"set-"+id,type:"working",weight,reps,rir,createdAt:date+"T10:00:00Z"}]}],
  });
  s.sessions.push(make("1","2026-10-14",80,10,9),make("2","2026-10-17",80,11,null));
  const p=performance(s);
  assert.equal(p.length,1);
  assert.equal(p[0].comparable,true);
  assert.equal(p[0].improved,true);
});

test("exercise library retains permanent custom IDs and matches brand searches",()=>{
  const s=initialState();
  s.customExercises=[{id:"mine-1",name:"器械平胸推",brand:"Newtech",
    equipment:"Machine",muscle:"Chest",usage:"both",
    allowRestPause:false,allowDropSet:false,createdAt:"2026-10-17T00:00:00Z"}];
  assert.doesNotThrow(()=>validateState(s));
  const results=searchExercises(exerciseLibrary(s),"Newtech");
  assert.equal(results.some(x=>x.id==="mine-1"&&x.source==="personal"),true);
  assert.equal(results.find(x=>x.id==="mine-1")?.name,"器械平胸推");
});

test("finishing workout records the final rest interval in the same session",()=>{
  const s=initialState();
  const session:Session={id:"s",name:"下午加練",date:"2026-10-17",
    status:"in_progress",isExtra:true,exercises:[],
    createdAt:"2026-10-17T07:00:00Z",
    restStartedAt:"2026-10-17T07:50:00Z",restTargetSeconds:120};
  s.sessions.push(session);
  completeSession(s,session,"2026-10-17T07:53:00Z");
  assert.equal(session.restHistory?.[0].elapsedSeconds,180);
  assert.equal(session.restHistory?.[0].targetSeconds,120);
  assert.equal(session.restStartedAt,undefined);
  assert.equal(session.activeDuration,53*60000);
});
