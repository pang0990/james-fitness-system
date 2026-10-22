import { validateTrainingSessions } from "./validation";
import type { Segment, Session } from "./types";

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

/** Historic corrections preserve the previous values and never change plan templates. */
export function correctCompletedSet(
  session:Session,exerciseId:string,setId:string,
  patch:Pick<Segment,"weight"|"reps"|"type">,
  changedAt:string,correctionId:string,
){
  if(session.status!=="completed")throw Error("只能更正已完成的訓練");
  const exercise=session.exercises.find(e=>e.id===exerciseId);
  const beforeSet=exercise?.sets.find(s=>s.id===setId);
  if(!exercise||!beforeSet)throw Error("找不到歷史組次");
  const before={weight:beforeSet.weight,reps:beforeSet.reps,type:beforeSet.type};
  if(before.weight===patch.weight&&before.reps===patch.reps&&before.type===patch.type)return false;
  const replaced=replaceWorkoutSet(exercise.sets,setId,patch);
  exercise.sets=replaced;
  (session.setCorrections??=[]).push({
    id:correctionId,editedAt:changedAt,exerciseId,setId,
    before,after:{weight:patch.weight,reps:patch.reps,type:patch.type},
  });
  return true;
}

/** An operation ID belongs to one attempted set, including retries after reload. */
export function appendWorkoutSet(session:Session, exerciseId:string, set:Segment) {
  if(session.setSubmissionIds?.includes(set.id) || session.exercises.some(e=>e.sets.some(s=>s.id===set.id)))return false;
  if(session.status!=="in_progress" || session.pausedAt)throw Error("訓練已結束或暫停，不能新增組次");
  const exercise=session.exercises.find(e=>e.id===exerciseId);
  if(!exercise)throw Error("動作不存在");
  const candidate=structuredClone(session);
  candidate.exercises.find(e=>e.id===exerciseId)!.sets.push(set);
  if(candidate.setDrafts)delete candidate.setDrafts[exerciseId];
  validateTrainingSessions([candidate]);
  exercise.sets.push({...set});
  (session.setSubmissionIds??=[]).push(set.id);
  if(session.setDrafts)delete session.setDrafts[exerciseId];
  return true;
}

/** Stable IDs win. Name fallback is only safe when both records predate library IDs. */
export function previousWorkingSets(sessions:Session[], exercise:Session["exercises"][number]) {
  return sessions.filter(s=>s.status==="completed").slice()
    .sort((a,b)=>(b.completedAt??b.createdAt).localeCompare(a.completedAt??a.createdAt))
    .flatMap(s=>s.exercises)
    .find(e=>exercise.exerciseLibraryId ? e.exerciseLibraryId===exercise.exerciseLibraryId :
      !e.exerciseLibraryId && e.name===exercise.name)?.sets.filter(s=>s.type==="working");
}
