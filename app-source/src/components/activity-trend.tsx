"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { averageSteps, activityContext, stepsInRange } from "@/lib/activity";
import { addDays } from "@/lib/domain";
import { LineChart } from "./trends";

export function ActivityTrend({date}:{date:string}) {
  const {state}=useStore();
  const [days,setDays]=useState<7|30>(7);
  const points=stepsInRange(state,date,days);
  const summary=averageSteps(state,date,days);
  // Cardio-only days count independently from steps, using the same local-date window.
  const start=addDays(date,1-days);
  const cardio=state.cardio.filter(item=>item.date>=start && item.date<=date);
  const cardioMinutes=cardio.reduce((total,item)=>total+item.minutes,0);
  return <section className="card activity-trend" id="activity-trend">
    <div className="activity-heading">
      <div><span className="eyebrow">ACTIVITY</span><h2>日常活動趨勢</h2></div>
      <div className="range-control">
        <button type="button" aria-pressed={days===7} onClick={()=>setDays(7)}>7D</button>
        <button type="button" aria-pressed={days===30} onClick={()=>setDays(30)}>30D</button>
      </div>
    </div>
    <div className="activity-trend-stats">
      <div><small>平均步數</small><strong>{summary.average===null?"—":summary.average.toLocaleString("en-US")}</strong>
        <span>{summary.count} / {days} 天紀錄</span></div>
      <div><small>有氧／活動時間</small><strong>{cardio.length?cardioMinutes:"—"}</strong>
        <span>{cardio.length?"分鐘（已記錄）":"未記錄"}</span></div>
    </div>
    {points.length>1?<LineChart points={points.map(p=>({date:p.date,value:p.steps}))} unit="steps" large/>:
      <p className="muted">至少需要兩天步數紀錄，才能顯示趨勢。</p>}
    <p className="muted activity-data-note">只統計已記錄的日期，未記錄不代表 0 步。活動資料不會自動更改營養目標。</p>
  </section>;
}

export function ActivityReviewContext({date}:{date:string}) {
  const {state}=useStore();
  const insight=activityContext(state,date);
  return <section className="card activity-review">
    <p className="eyebrow">ACTIVITY CONTEXT</p>
    <h2>活動量參考</h2>
    <div className="activity-review-metrics">
      <div><small>最近 7 天</small><strong>{insight.recent.average===null?"—":insight.recent.average.toLocaleString("en-US")}</strong>
        <span>{insight.recent.count}/7 天</span></div>
      <div><small>前 7 天</small><strong>{insight.previous.average===null?"—":insight.previous.average.toLocaleString("en-US")}</strong>
        <span>{insight.previous.count}/7 天</span></div>
    </div>
    <p>{insight.message}</p>
    {insight.changePercent!==null&&<p className="muted">七日平均變化 {insight.changePercent>0?"+":""}{insight.changePercent}% · 僅供輔助評估</p>}
  </section>;
}
