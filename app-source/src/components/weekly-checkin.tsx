"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import {
  addDays, activePlan, activityEvidenceForReview, daysBetween,
  mealCompletion, mealTotals, resolveDay, round, visibleMeasurements,
} from "@/lib/domain";
import { averageSteps } from "@/lib/activity";
import { scheduleKind } from "@/lib/training-model";
import { PageTitle } from "./daily";

/** Seven-day read-only check-in. Nutrition prescriptions live in /progress/review. */
export function WeeklyCheckin({date}:{date:string}){
  const {state}=useStore();
  const recent=Array.from({length:7},(_,i)=>addDays(date,i-6));
  const prior=Array.from({length:7},(_,i)=>addDays(date,i-13));
  const weights=visibleMeasurements(state);
  const weighted=(range:string[])=>weights.filter(r=>range.includes(r.date)).map(r=>r.weight);
  const wA=weighted(prior),wB=weighted(recent);
  const avg=(list:number[])=>list.reduce((a,b)=>a+b,0)/list.length;
  const weightChange=wA.length>=4&&wB.length>=4?round(avg(wB)-avg(wA)):null;
  const logged=recent.filter(day=>mealCompletion(state,day).completed);
  const withTarget=logged.filter(day=>Boolean(resolveDay(state,day).target));
  const adherence=withTarget.length?Math.round(100*withTarget.filter(day=>{
    const target=resolveDay(state,day).target;
    if(!target||target.kcal<=0||target.p<=0)return false;
    const intake=mealTotals(state,day);
    return intake.kcal>=target.kcal*.9&&intake.kcal<=target.kcal*1.1&&intake.p>=target.p*.9;
  }).length/withTarget.length):null;
  const hasSchedule=Boolean(state.weeklySchedule?.length || state.schedule?.some(r=>r.kind==="train"&&!r.cleared));
  const planned=hasSchedule?recent.filter(day=>scheduleKind(state,day)==="train"):[];
  const completedDates=new Set(state.sessions.filter(r=>r.status==="completed"&&!r.isExtra)
    .map(r=>r.workoutDate??r.date));
  const completed=planned.filter(day=>completedDates.has(day)).length;
  const recovery=new Set([
    ...(state.recoveryEntries??[]).filter(r=>recent.includes(r.date)).map(r=>r.date),
    ...state.recoveries.filter(r=>recent.includes(r.date)).map(r=>r.date),
  ]);
  const steps=averageSteps(state,date,7);
  const activity=activityEvidenceForReview(state,date);
  const plan=activePlan(state,date);
  const goal=state.profile?.goal;
  const reviewDays=goal==="GAIN"?14:10;
  const elapsed=plan?daysBetween(plan.effectiveDate,date)+1:0;
  const reviewInfo=!plan?"尚未建立營養目標":
    elapsed<reviewDays?`持續紀錄 · 尚需至少 ${reviewDays-elapsed} 天進入本期評估窗口`:
    `已達基本觀察週期，是否能提出建議仍須檢查體重、飲食與訓練資料`;
  return <div className="daily-page weekly-checkin-page">
    <PageTitle title="Weekly Check-in" />
    <p className="muted">{recent[0]} — {date} · 最近七天回顧</p>
    <section className="card">
      <h2>本週摘要</h2>
      <div className="weekly-data-grid">
        <Link href="/progress/body"><span>BODY · 平均體重變化</span>
          <strong>{weightChange===null?"資料不足":`${weightChange>0?"+":""}${weightChange} kg`}</strong>
          <small>前後兩週各至少 4 天體重</small></Link>
        <Link href="/progress/nutrition"><span>NUTRITION · 執行</span>
          <strong>{adherence===null?"資料不足":adherence+"%"}</strong>
          <small>飲食完整：{logged.length}/7 天</small></Link>
        <Link href="/progress/training"><span>TRAINING · 完成</span>
          <strong>{planned.length?`${completed}/${planned.length}`:"資料不足"}</strong>
          <small>僅計有安排的訓練日</small></Link>
        <Link href="/progress/recovery"><span>RECOVERY · 紀錄</span>
          <strong>{recovery.size}/7 天</strong><small>未做疾病或醫療評估</small></Link>
        <Link href="/progress#activity-trend"><span>ACTIVITY · 步數</span>
          <strong>{steps.average===null?"資料不足":steps.average.toLocaleString("en-US")}</strong>
          <small>{steps.count}/7 天有紀錄</small></Link>
      </div>
    </section>
    {activity.significant && <section className="card activity-review-hold">
      <span className="eyebrow">ACTIVITY INSIGHT</span>
      <h2>本週活動量有明顯變化</h2>
      <p>前一週平均 {activity.previousAverage?.toLocaleString("en-US")} 步；
        本週 {activity.recentAverage?.toLocaleString("en-US")} 步
        （{activity.changePercent!>0?"+":""}{activity.changePercent}%）。</p>
      <p className="muted">請先確認活動量改變的原因，再決定是否接受營養調整；步數不能直接換算可吃熱量。</p>
    </section>}
    <section className="card stack">
      <h2>{goal==="GAIN"?"GAIN · 14 天評估":"CUT · 10 天評估"}</h2>
      <p>{reviewInfo}</p>
      <div className="form-actions">
        <Link href="/progress/review" className="button">查看營養評估</Link>
        <Link href="/progress/history" className="button secondary">決策紀錄</Link>
      </div>
    </section>
  </div>;
}
