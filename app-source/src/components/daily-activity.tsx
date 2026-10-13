"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { averageSteps } from "@/lib/activity";
import { Field, Sheet, uid, stamp } from "./daily";

const activityTypes=["步行","跑步","騎車","游泳","球類運動","其他有氧","日常活動"];

export function DailyActivity({ date, notify }:{date:string;notify:(s?:string)=>void}) {
  const {state,save}=useStore();
  const [sheet,setSheet]=useState<"steps"|"activity"|null>(null);
  const [steps,setSteps]=useState("");
  const [kind,setKind]=useState("步行");
  const [minutes,setMinutes]=useState("");
  const [editId,setEditId]=useState<string|null>(null);
  const [error,setError]=useState("");
  const item=state.dailySteps?.find(r=>r.date===date);
  const average=averageSteps(state,date,7);
  const activities=state.cardio.filter(r=>r.date===date);
  const totalMinutes=activities.reduce((n,r)=>n+r.minutes,0);

  const close=()=>{setSheet(null);setError("");setEditId(null);};
  const openSteps=()=>{setSteps(item?String(item.steps):"");setError("");setSheet("steps");};
  const openActivity=(id?:string)=>{
    const existing=state.cardio.find(r=>r.id===id);
    setEditId(existing?.id??null);setKind(existing?.type??"步行");
    setMinutes(existing?String(existing.minutes):"");
    setError("");setSheet("activity");
  };
  function saveSteps(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const value=Number(steps);
    if(!/^\d+$/.test(steps.trim())||!Number.isSafeInteger(value)||value<0||value>100000){
      setError("請輸入 0 到 100,000 的有效整數步數。");return;
    }
    if(save("記錄每日步數",s=>{
      const existing=(s.dailySteps??=[]).find(r=>r.date===date);
      if(existing){existing.steps=value;existing.source="manual";existing.updatedAt=stamp();delete existing.externalId;}
      else s.dailySteps!.push({id:uid(),date,steps:value,source:"manual",updatedAt:stamp()});
    })){close();notify("步數已儲存");}
  }
  function saveActivity(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const duration=Number(minutes);
    if(!/^\d+$/.test(minutes.trim())||duration<1||duration>1440){
      setError("請輸入 1–1440 分鐘的活動時間。");return;
    }
    if(save(editId?"修改每日活動":"新增每日活動",s=>{
      const existing=s.cardio.find(r=>r.id===editId);
      if(existing){existing.type=kind;existing.minutes=duration;existing.source="manual";}
      else s.cardio.push({id:uid(),date,type:kind,minutes:duration,calories:null,createdAt:stamp(),source:"manual"});
    })){close();notify("活動已儲存");}
  }
  return <section className="card daily-activity">
    <div className="activity-heading">
      <h2>Activity</h2>
      <Link className="text-link" href="/progress">查看趨勢 →</Link>
    </div>
    <div className="activity-overview">
      <button type="button" className="activity-metric" onClick={openSteps}>
        <small>今日步數</small><strong>{item ? item.steps.toLocaleString("en-US") : "—"}</strong>
        <span>{item ? "編輯步數" : "＋ 記錄步數"}</span>
      </button>
      <div className="activity-metric">
        <small>七日平均</small><strong>{average.average===null?"—":average.average.toLocaleString("en-US")}</strong>
        <span>{average.count}/7 天有紀錄</span>
      </div>
    </div>
    <div className="activity-log-head">
      <span>有氧／其他活動</span>
      <button type="button" className="text-link" onClick={()=>openActivity()}>＋ 記錄</button>
    </div>
    {activities.length ? <div className="activity-log-list">{activities.map(a=>(
      <div className="activity-log-row" key={a.id}>
        <button type="button" onClick={()=>openActivity(a.id)} aria-label={`編輯${a.type} ${a.minutes}分鐘`}>
          <strong>{a.type}</strong><span>{a.minutes} 分鐘</span>
        </button>
        <button type="button" className="activity-delete" aria-label={`刪除${a.type}`}
          onClick={()=>{if(!window.confirm("確定刪除這筆活動？"))return;
            if(save("刪除每日活動",s=>{s.cardio=s.cardio.filter(r=>r.id!==a.id);}))notify("活動已刪除");}}>移除</button>
      </div>))}<small>合計 {totalMinutes} 分鐘</small></div>
    : <p className="muted activity-empty">尚無活動紀錄</p>}
    {sheet==="steps"&&<Sheet title={`${date} · 步數`} onClose={close}>
      <form onSubmit={saveSteps} className="stack">
        <Field label="當天總步數"><input type="number" inputMode="numeric" min="0" max="100000"
          placeholder="例如 8500" required value={steps} onChange={e=>{setSteps(e.target.value);setError("");}}/></Field>
        {item&&<p className="muted">目前來源：{item.source==="apple_health"?"Apple Health":"手動紀錄"}</p>}
        {error&&<p className="form-error" role="alert">{error}</p>}
        <div className="form-actions">
          {item&&<button type="button" className="button secondary" onClick={()=>{
            if(!window.confirm("確定刪除這一天的步數紀錄？"))return;
            if(save("刪除每日步數",s=>{s.dailySteps=(s.dailySteps??[]).filter(r=>r.date!==date);})) {close();notify("步數已刪除");}
          }}>刪除</button>}
          <button className="button" type="submit">儲存步數</button>
        </div>
      </form>
    </Sheet>}
    {sheet==="activity"&&<Sheet title={`${date} · ${editId?"編輯":"新增"}活動`} onClose={close}>
      <form onSubmit={saveActivity} className="stack">
        <Field label="活動類型"><select value={kind} onChange={e=>setKind(e.target.value)}>
          {activityTypes.map(a=><option key={a}>{a}</option>)}
        </select></Field>
        <Field label="時間（分鐘）"><input type="number" inputMode="numeric" min="1" max="1440"
          placeholder="例如 30" required value={minutes} onChange={e=>{setMinutes(e.target.value);setError("");}}/></Field>
        {error&&<p className="form-error" role="alert">{error}</p>}
        <div className="form-actions"><button type="button" className="button secondary" onClick={close}>取消</button>
          <button type="submit" className="button">儲存活動</button></div>
      </form>
    </Sheet>}
  </section>;
}
