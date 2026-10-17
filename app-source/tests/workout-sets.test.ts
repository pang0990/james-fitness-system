import {test} from "node:test";
import assert from "node:assert/strict";
import type {Segment} from "../src/lib/domain";
import {removeWorkoutSet,restoreWorkoutSets,replaceWorkoutSet} from "../src/lib/workout-sets";
const mk=(id:string,type:Segment["type"],parentId?:string):Segment=>({
 id,type,weight:80,reps:10,rir:null,createdAt:"2026-10-17T00:00:00Z",...(parentId?{parentId}:{})
});
test("delete working set cascades only its linked RP/drop children",()=>{
 const sets=[mk("w1","working"),mk("r1","rp","w1"),mk("r2","rp","w1"),mk("w2","working")];
 const result=removeWorkoutSet(sets,"w1");
 assert.deepEqual(result.remaining.map(x=>x.id),["w2"]);
 assert.deepEqual(result.removed.map(x=>x.id),["w1","r1","r2"]);
 const restored=restoreWorkoutSets(result.remaining,result.removed,result.indices);
 assert.deepEqual(restored.map(x=>x.id),sets.map(x=>x.id));
});
test("delete mistaken RP alone does not delete parent working set",()=>{
 const sets=[mk("w1","working"),mk("r1","rp","w1"),mk("r2","rp","w1")];
 const result=removeWorkoutSet(sets,"r2");
 assert.deepEqual(result.remaining.map(x=>x.id),["w1","r1"]);
 const restored=restoreWorkoutSets(result.remaining,result.removed,result.indices);
 assert.deepEqual(restored.map(x=>x.id),["w1","r1","r2"]);
 assert.deepEqual(restoreWorkoutSets(restored,result.removed,result.indices).map(x=>x.id),
   ["w1","r1","r2"]);
});
test("editing set retains ID and siblings, protects RP parent",()=>{
 const sets=[mk("w1","working"),mk("r1","rp","w1")];
 const changed=replaceWorkoutSet(sets,"r1",{type:"rp",weight:75,reps:2});
 assert.equal(changed[1].weight,75);
 assert.equal(changed[1].parentId,"w1");
 assert.equal(sets[1].weight,80);
 assert.throws(()=>replaceWorkoutSet(sets,"w1",{type:"drop",weight:80,reps:10}));
 assert.throws(()=>replaceWorkoutSet(sets,"r1",{type:"working",weight:80,reps:10}));
});
