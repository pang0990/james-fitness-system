import { addDays, type AppState, type Session } from "./domain";

/** Versioned display-only training comparisons; never rewrite historical sets. */
export const TRAINING_PERFORMANCE_RULE_VERSION = "working-sets-e1rm-v1";
type Exercise = Session["exercises"][number];
export type SetEvidence = {
  date: string; sessionId: string; exerciseId: string;
  exerciseLibraryId?: string; name: string;
  weight: number; reps: number; rir: number | null;
  e1rm: number | null;
};
export type ProgressEvidence = {
  key: string; name: string; before: SetEvidence; after: SetEvidence;
  outcome: "improved" | "not-proven";
  reason: string; e1rmChangePercent: number | null;
  ruleVersion: string;
};

/** Estimate only within 1–12 repetitions; never treat it as a measured 1RM. */
export function estimatedOneRepMax(weight: number, reps: number): number | null {
  if (!Number.isFinite(weight) || weight <= 0 || !Number.isInteger(reps) || reps < 1 || reps > 12)
    return null;
  return weight * (1 + reps / 30);
}
const exerciseKey=(e:Exercise)=>e.exerciseLibraryId
  ? "id:"+e.exerciseLibraryId
  : "legacy:"+e.name.trim().toLocaleLowerCase();
/** Same-ID comparisons only. Legacy name matching never crosses an ID boundary. */
export function trainingProgressEvidence(state: AppState): ProgressEvidence[] {
  const byExercise=new Map<string,SetEvidence[]>();
  const sessions=state.sessions.filter(s=>s.status==="completed")
    .slice().sort((a,b)=>(a.completedAt??a.workoutDate??a.date).localeCompare(b.completedAt??b.workoutDate??b.date));
  for(const session of sessions)for(const exercise of session.exercises) {
    const sets=exercise.sets.filter(s=>s.type==="working");
    if(!sets.length)continue;
    const ranked=sets.slice().sort((a,b)=>
      (estimatedOneRepMax(b.weight,b.reps)??0)-(estimatedOneRepMax(a.weight,a.reps)??0)
      || b.weight-a.weight || b.reps-a.reps);
    const set=ranked[0],key=exerciseKey(exercise);
    byExercise.set(key,[...(byExercise.get(key)??[]),{
      date:session.workoutDate??session.date,sessionId:session.id,exerciseId:exercise.id,
      exerciseLibraryId:exercise.exerciseLibraryId,name:exercise.name,
      weight:set.weight,reps:set.reps,rir:set.rir,e1rm:estimatedOneRepMax(set.weight,set.reps),
    }]);
  }
  const result:ProgressEvidence[]=[];
  for(const [key,records] of byExercise) {
    if(records.length<2)continue;
    const before=records[records.length-2],after=records[records.length-1];
    if(before.sessionId===after.sessionId)continue;
    const delta=before.e1rm!==null && before.e1rm>0 && after.e1rm!==null
      ? (after.e1rm/before.e1rm-1)*100 : null;
    const repsAtSameWeight=after.weight===before.weight && after.reps>before.reps;
    const improved=repsAtSameWeight || (delta!==null && delta>=1);
    result.push({key,name:after.name,before,after,outcome:improved?"improved":"not-proven",
      reason:repsAtSameWeight?"同重量增加次數":delta!==null&&delta>=1?"估算 e1RM 增加至少 1%":
        "尚無符合門檻的證據；不代表一定退步",
      e1rmChangePercent:delta,ruleVersion:TRAINING_PERFORMANCE_RULE_VERSION});
  }
  return result.sort((a,b)=>b.after.date.localeCompare(a.after.date));
}
export type VolumeEvidence={muscle:string;workingSets:number};
/** Monday-based local date window, completed session snapshots only. */
export function weeklyWorkingVolume(state:AppState,referenceDate:string):{
  start:string;end:string;byMuscle:VolumeEvidence[];totalWorkingSets:number;unassigned:number;
} {
  const dow=new Date(referenceDate+"T12:00:00Z").getUTCDay();
  const start=addDays(referenceDate,-((dow+6)%7)),end=addDays(start,6);
  const counts=new Map<string,number>(),unassigned={n:0};
  let totalWorkingSets=0;
  for(const s of state.sessions) {
    const d=s.workoutDate??s.date;
    if(s.status!=="completed"||d<start||d>end)continue;
    for(const ex of s.exercises)for(const set of ex.sets)if(set.type==="working") {
      totalWorkingSets++;
      if(ex.muscle)counts.set(ex.muscle,(counts.get(ex.muscle)??0)+1);
      else unassigned.n++;
    }
  }
  return {start,end,totalWorkingSets,unassigned:unassigned.n,
    byMuscle:[...counts].map(([muscle,workingSets])=>({muscle,workingSets}))
      .sort((a,b)=>b.workingSets-a.workingSets||a.muscle.localeCompare(b.muscle))};
}
/** Count only completed sessions in the current Cycle round. No RP/Drop duplication. */
export function currentCycleWorkingVolume(state:AppState,cycleId:string):{
  workingSets:number;byMuscle:VolumeEvidence[];
} {
  const cycle=state.cycles?.find(c=>c.id===cycleId);
  if(!cycle)return {workingSets:0,byMuscle:[]};
  const counts=new Map<string,number>();
  let workingSets=0;
  for(const s of state.sessions) {
    if(s.cycleId!==cycleId||s.status!=="completed"||s.cycleCounted===false||s.isExtra)continue;
    if(s.round!==undefined&&s.round!==(cycle.round??1))continue;
    for(const e of s.exercises)for(const set of e.sets)if(set.type==="working") {
      workingSets++;
      if(e.muscle)counts.set(e.muscle,(counts.get(e.muscle)??0)+1);
    }
  }
  return {workingSets,byMuscle:[...counts].map(([muscle,workingSets])=>({muscle,workingSets}))};
}
