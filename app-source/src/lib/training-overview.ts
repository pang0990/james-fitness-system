import {addDays,type AppState,type Session} from './domain';
import {nextDayIndex,dayId} from './training-queue';
import {activeCycle,scheduleEntry} from './training-model';
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

/** Shared Today/Training status. A pending day alone is never a calendar booking. */
export function resolveTrainingToday(state: AppState, date: string) {
 const current = state.sessions.find(s => s.status === 'in_progress');
 const completed = state.sessions.filter(s => s.status === 'completed' && (s.workoutDate ?? s.date) === date);
 const cycle = activeCycle(state), schedule = scheduleEntry(state,date);
 const selected = cycle?.days.findIndex((_,i) => dayId(cycle,i) === schedule.trainingDayId) ?? -1;
 const index = cycle ? (selected >= 0 ? selected : Math.max(0,nextDayIndex(state,cycle))) : 0;
 const day = cycle?.days[index];
 const scheduled = !!schedule.id || state.weeklySchedule !== undefined;
 const kind = current ? 'active' : completed.length ? 'completed' : scheduled && (schedule.kind === 'rest' || schedule.kind === 'temporary_rest') ? 'rest' : !day ? 'empty' : scheduled ? 'scheduled' : 'pending';
 const title = current?.name ?? (kind === 'completed' ? '今日訓練已完成' : kind === 'rest' ? '今日休息' : kind === 'pending' ? '今日尚未排定訓練' : day?.name ?? '建立你的訓練計畫');
 const label = kind === 'active' ? '繼續訓練' : kind === 'completed' ? '查看訓練紀錄' : kind === 'rest' ? '查看待練課表' : kind === 'pending' ? '安排訓練日期' : kind === 'scheduled' ? '開始訓練' : '建立課表';
 const href = kind === 'active' ? '/training/session' : kind === 'completed' ? '/training/history' : kind === 'pending' ? '/training/calendar' : kind === 'empty' ? '/training/plan' : '/training';
 return {kind,title,label,href,current,completed,cycle,day,index};
}
