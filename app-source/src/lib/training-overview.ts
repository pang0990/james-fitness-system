import {addDays,type AppState,type Session} from './domain';
import {scheduleEntry} from './training-model';
export function workoutProgress(session:Session){
 const working=session.exercises.reduce((n,e)=>n+e.sets.filter(s=>s.type==='working').length,0);
 const planned=session.exercises.reduce((n,e)=>n+(e.plannedSets??0),0);
 const completedExercises=session.exercises.filter(e=>e.plannedSets&&e.sets.filter(s=>s.type==='working').length>=e.plannedSets).length;
 return {working,planned,completedExercises};
}
export function trainingWeek(state:AppState,date:string){
 const offset=(new Date(date+'T12:00:00Z').getUTCDay()+6)%7;
 return Array.from({length:7},(_,i)=>{
  const d=addDays(date,i-offset),sessions=state.sessions.filter(s=>(s.workoutDate??s.date)===d);
  const done=sessions.filter(s=>s.status==='completed').length;
  const active=sessions.find(s=>s.status==='in_progress');
  const schedule=scheduleEntry(state,d);
  // The domain's default train value is not evidence of an actual schedule.
  const scheduled=!!schedule.id||state.weeklySchedule!==undefined;
  const status=active?(active.pausedAt?'已暫停':'進行中'):done?'已完成':!scheduled?'未排定':schedule.kind==='rest'||schedule.kind==='temporary_rest'?'休息日':d<date?'待確認':'已排定';
  return {date:d,status,done,today:d===date};
 });
}
