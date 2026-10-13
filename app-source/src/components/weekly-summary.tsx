"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { addDays, mealCompletion, mealTotals, resolveDay, round, visibleMeasurements } from "@/lib/domain";
import { performance, scheduleKind } from "@/lib/training-model";
import { RecoveryEntryPoints } from "./recovery-log";

function dateWindow(end:string,days:number) {
  return Array.from({length:days},(_,i)=>addDays(end,i-days+1));
}
function avg(n:number[]) { return n.reduce((a,b)=>a+b,0)/n.length; }

export function WeeklySummary({date}:{date:string}) {
  const {state} = useStore();
  const current = dateWindow(date,7), prior = dateWindow(addDays(date,-7),7);
  const weightData=visibleMeasurements(state);
  const currentWeights=weightData.filter(w=>current.includes(w.date)).map(w=>w.weight);
  const priorWeights=weightData.filter(w=>prior.includes(w.date)).map(w=>w.weight);
  const weightDelta=currentWeights.length>=4 && priorWeights.length>=4 ?
    round(avg(currentWeights)-avg(priorWeights)):null;

  const completedDays=current.filter(d=>mealCompletion(state,d).completed);
  const adherenceDays=completedDays.filter(d=>{
    const target=resolveDay(state,d).target;
    if(!target||target.kcal<=0||target.p<=0)return false;
    const intake=mealTotals(state,d);
    return intake.kcal>=target.kcal*.9 && intake.kcal<=target.kcal*1.1 && intake.p>=target.p*.9;
  });
  const hasNutritionTarget=completedDays.some(d=>Boolean(resolveDay(state,d).target));
  const adherence=hasNutritionTarget && completedDays.length > 0 ?
    Math.round(adherenceDays.length/completedDays.length*100):null;

  const canMeasureSchedule=Boolean(state.weeklySchedule?.length || state.schedule?.some(s=>s.kind==="train" && !s.cleared));
  const scheduled=canMeasureSchedule? current.filter(d=>scheduleKind(state,d)==="train"):[];
  const finishedSessions=state.sessions.filter(s=>s.status==="completed" && current.includes(s.workoutDate??s.date) && !s.isExtra);
  const doneDates=new Set(finishedSessions.map(s=>s.workoutDate??s.date));
  const trainingFinished=scheduled.filter(d=>doneDates.has(d)).length;

  const recentSessions=state.sessions.filter(s=>s.status==="completed" && s.date>=addDays(date,-13) && s.date<=date);
  const comparable=performance({...state,sessions:recentSessions}).filter(p=>p.comparable);
  const improved=comparable.filter(p=>p.improved);
  const performanceText=comparable.length<2?"Not Enough Data":
    improved.length/comparable.length>=.5?"Improving":"觀察中";
  const recoveryDates=new Set([
    ...(state.recoveryEntries??[]).filter(r=>current.includes(r.date)).map(r=>r.date),
    ...state.recoveries.filter(r=>current.includes(r.date)).map(r=>r.date),
  ]);

  return (
    <>
      <section className="card weekly-quick">
        <h2>Quick Health Log</h2>
        <p className="muted">Sleep、Stress、Fatigue、Soreness 各自記錄；疼痛進入獨立安全流程。</p>
        <RecoveryEntryPoints date={date} />
      </section>
      <section className="card weekly-summary">
        <h2>This Week</h2>
        <p className="muted">最近 7 天真實紀錄；資料不足時不預設為 Normal 或 Improving。</p>
        <div className="weekly-data-grid">
          <Link href="/progress/body"><span>BODY · 週平均體重</span>
            <strong>{weightDelta===null?"Not Enough Data":`${weightDelta>0?"+":""}${weightDelta} kg`}</strong>
            <small>兩週各至少 4 筆體重才顯示週變化</small>
          </Link>
          <Link href="/progress/nutrition"><span>NUTRITION · Adherence</span>
            <strong>{adherence===null?"Not Enough Data":`${adherence}%`}</strong>
            <small>Logging Completion：{completedDays.length} / 7 天</small>
          </Link>
          <Link href="/progress/training"><span>TRAINING · Completion</span>
            <strong>{scheduled.length?`${trainingFinished}/${scheduled.length}`:"Not Enough Data"}</strong>
            <small>{scheduled.length?"僅計排定訓練，不包含 Extra Workout":"尚無可比較的訓練排程"}</small>
          </Link>
          <Link href="/progress/training/exercises"><span>TRAINING · Performance</span>
            <strong>{performanceText}</strong>
            <small>{comparable.length} 項可比較動作；{improved.length} 項進步</small>
          </Link>
          <Link href="/progress/recovery"><span>RECOVERY · Logging</span>
            <strong>{recoveryDates.size}/7 天</strong>
            <small>非醫療恢復分數；請查看不同指標</small>
          </Link>
        </div>
        <Link href="/progress/check-in" className="button secondary">Weekly Check-in →</Link>
      </section>
    </>
  );
}
