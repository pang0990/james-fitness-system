"use client";
import { useState, type FormEvent } from "react";
import { useStore } from "@/lib/store";
import { Field, Sheet, uid, stamp } from "./daily";

/** Reusable entry for Today and a selected point on the Progress activity chart. */
export function StepEntryDialog({
  startDate, maxDate, close, notify,
}: { startDate:string; maxDate:string; close:()=>void; notify:(message?:string)=>void; }) {
  const {state,save}=useStore();
  const [entryDate,setEntryDate]=useState(startDate);
  const [steps,setSteps]=useState(
    String(state.dailySteps?.find(r=>r.date===startDate)?.steps ?? ""),
  );
  const [error,setError]=useState("");
  const existing=state.dailySteps?.find(row=>row.date===entryDate);
  const chooseDate=(next:string)=>{
    setEntryDate(next);
    setSteps(String(state.dailySteps?.find(row=>row.date===next)?.steps??""));
    setError("");
  };
  function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value=Number(steps);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(entryDate) || entryDate>maxDate ||
        !/^\d+$/.test(steps.trim()) || !Number.isSafeInteger(value) || value>100000) {
      setError("請選擇今天或過去的日期，並輸入有效的 0–100,000 整數步數。");
      return;
    }
    if(save("儲存每日步數",s=>{
      const row=(s.dailySteps??=[]).find(r=>r.date===entryDate);
      if(row){
        row.steps=value;row.source="manual";row.updatedAt=stamp();
        delete row.externalId;
      } else {
        s.dailySteps!.push({id:uid(),date:entryDate,steps:value,source:"manual",updatedAt:stamp()});
      }
    })){close();notify("步數已儲存");}
  }
  function remove(){
    if(!existing || !window.confirm(`確定刪除 ${entryDate} 的步數紀錄？`))return;
    if(save("刪除每日步數",s=>{s.dailySteps=(s.dailySteps??[]).filter(row=>row.date!==entryDate);}))
      {close();notify("步數已刪除");}
  }
  return <Sheet title="記錄每日步數" onClose={close}>
    <form className="stack" onSubmit={submit}>
      <Field label="紀錄日期"><input type="date" max={maxDate} required value={entryDate}
        onChange={event=>chooseDate(event.target.value)}/></Field>
      <Field label="當天總步數"><input type="number" min="0" max="100000" inputMode="numeric"
        placeholder="例如 8500" value={steps} onChange={event=>{setSteps(event.target.value);setError("");}} required/></Field>
      {existing && <small className="muted">來源：{existing.source==="apple_health"?"Apple Health（手動修改將改為手動資料）":"手動紀錄"}</small>}
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="form-actions">
        {existing && <button className="button secondary" type="button" onClick={remove}>刪除這天紀錄</button>}
        <button className="button" type="submit">儲存步數</button>
      </div>
    </form>
  </Sheet>;
}
