import type { Segment } from "./domain";

export function removeWorkoutSet(sets:Segment[],id:string){
  const removed=sets.filter(s=>s.id===id||s.parentId===id);
  const ids=new Set(removed.map(s=>s.id));
  return {
    remaining:sets.filter(s=>!ids.has(s.id)),
    removed:removed.map(s=>({...s})),
    indices:removed.map(s=>sets.findIndex(x=>x.id===s.id)),
  };
}

export function restoreWorkoutSets(
  sets:Segment[],removed:Segment[],indices:number[],
){
  const result=sets.slice();
  removed.map((s,i)=>({set:s,index:indices[i]}))
    .sort((a,b)=>a.index-b.index)
    .forEach(({set,index})=>{
      if(!result.some(s=>s.id===set.id))
        result.splice(Math.max(0,Math.min(index,result.length)),0,{...set});
    });
  return result;
}

export function replaceWorkoutSet(
  sets:Segment[],id:string,patch:Pick<Segment,"weight"|"reps"|"type">,
){
  const original=sets.find(s=>s.id===id);
  if(!original)throw Error("找不到要修改的組次");
  if(!Number.isFinite(patch.weight)||patch.weight<0||patch.weight>1000 ||
    !Number.isInteger(patch.reps)||patch.reps<1||patch.reps>500)
    throw Error("重量或次數無效");
  if(sets.some(s=>s.parentId===id)&&patch.type!=="working")
    throw Error("已有延伸組，請先移除延伸組");
  const kind=original.parentId?["rp","drop"]:["working","warmup","rampup"];
  if(!kind.includes(patch.type))throw Error("組型不適用此組次");
  return sets.map(s=>s.id===id?{...s,...patch}:s);
}
