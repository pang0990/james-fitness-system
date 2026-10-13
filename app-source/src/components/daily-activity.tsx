"use client";
import { useState, type FormEvent } from "react";
import { useStore } from "@/lib/store";
import { Field, Sheet, uid, stamp } from "./daily";

const activityTypes=["步行","跑步","騎車","游泳","球類運動","其他有氧","日常活動"];
export function DailyActivity({ date, notify }:{date:string;notify:(s?:string)=>void}){
  const {state,save}=useStore();
  const [open,setOpen]=useState(false);
  const [kind,setKind]=useState("步行");
  const [minutes,setMinutes]=useState("");
  const [kcal,setKcal]=useState("");
  const [error,setError]=useState("");
  const items=state.cardio.filter(a=>a.date===date);
  const total=items.reduce((a,x)=>a+x.minutes,0);
  function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const duration=Number(minutes);
    const calories=kcal.trim()===""?null:Number(kcal);
    if(!Number.isFinite(duration)||duration<=0||duration>1440||
      (calories!==null&&(!Number.isFinite(calories)||calories<0||calories>5000))){
      setError("請輸入有效的活動時間；熱量可不填。");return;
    }
    if(save("記錄每日活動量",s=>{
      s.cardio.push({id:uid(),date,type:kind,minutes:duration,calories,createdAt:stamp()});
    })){
      setMinutes("");setKcal("");setError("");setOpen(false);
      notify("今日活動已記錄");
    }
  }
  return <section className="card daily-activity">
    <div className="card-head">
      <div><small className="eyebrow">DAILY ACTIVITY</small><h2>今日活動量</h2></div>
      <button type="button" className="button secondary" onClick={()=>setOpen(true)}>＋ 記錄活動</button>
    </div>
    <p className="muted">{items.length?`已記錄 ${items.length} 次活動，共 ${total} 分鐘`:"尚未記錄今天的活動"}</p>
    <p className="muted">活動資料用於理解每日活動與營養變化，不會把估計消耗的熱量自動加回可吃熱量。</p>
    {items.map(item=><div className="simple-row" key={item.id}>
      <span>{item.type} · {item.minutes} 分鐘 {item.calories!==null?`· 估算 ${item.calories} kcal`:""}</span>
      <button type="button" className="text-link" onClick={()=>{
        if(!window.confirm("刪除這筆活動記錄？不影響當日飲食與訓練紀錄。"))return;
        if(save("刪除每日活動",s=>{s.cardio=s.cardio.filter(a=>a.id!==item.id);}))notify("活動記錄已刪除");
      }}>刪除</button>
    </div>)}
    {open&&<Sheet title={`${date} · 記錄活動量`} onClose={()=>setOpen(false)}>
      <form className="stack" onSubmit={submit}>
        <p className="muted">只記錄今天實際活動的類型與時間；沒有熱量數據也可以儲存。</p>
        <Field label="活動類型"><select value={kind} onChange={e=>setKind(e.target.value)}>
          {activityTypes.map(a=><option key={a}>{a}</option>)}</select></Field>
        <Field label="活動時間（分鐘）"><input type="number" inputMode="decimal" min="1" max="1440" step="1" required
          placeholder="本次活動幾分鐘？" value={minutes} onChange={e=>setMinutes(e.target.value)}/></Field>
        <Field label="估計消耗 kcal（選填，不加回可吃熱量）"><input type="number" min="0" max="5000"
          inputMode="decimal" placeholder="沒有資料可留空" value={kcal} onChange={e=>setKcal(e.target.value)}/></Field>
        {error&&<p className="form-error" role="alert">{error}</p>}
        <div className="form-actions"><button className="button secondary" type="button" onClick={()=>setOpen(false)}>取消</button><button className="button" type="submit">儲存活動</button></div>
      </form>
    </Sheet>}
  </section>;
}
