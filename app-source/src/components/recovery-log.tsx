"use client";
import { useState, type FormEvent } from "react";
import { useStore } from "@/lib/store";
import { type RecoveryEntry, visibleMeasurements } from "@/lib/domain";
import { latestRecovery, recoveryEntries, painLevel, safetyText } from "@/lib/recovery";
import { Sheet, Field, uid, stamp } from "./daily";

export const labels = {
  sleep: "睡眠品質", fatigue: "疲勞", stress: "壓力", soreness: "肌肉痠痛", pain: "疼痛",
} as const;
const soreAreas = ["肩頸","胸","肩膀","上背","背闊肌","下背","二頭肌","三頭肌","前臂","腹部","臀部","股四頭肌","腿後側","內收肌","小腿","其他"];
const painAreas = ["頸部","肩膀","手肘","手腕／手","上背","下背","髖部","膝蓋","腳踝／腳","其他"];

export function RecoveryQuickLog({
  date, close, notify, initialKind="sleep",
}: {initialKind?:RecoveryEntry["type"] | "weight";date:string;close:()=>void;notify:(s?:string)=>void;}) {
  const {save}=useStore();
  // Fresh form every time it opens: no old ratings or quantities preselected.
  const [kind,setKind]=useState<RecoveryEntry["type"]|"weight">(initialKind);
  const [score,setScore]=useState<number|null>(null);
  const [weight,setWeight]=useState("");
  const [area,setArea]=useState("");
  const [side,setSide]=useState("Both");
  const [flags,setFlags]=useState<string[]>([]);
  const [error,setError]=useState("");
  const pain=kind==="pain";
  const saveLog=(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    const number=kind==="weight"?Number(weight):score;
    if(number===null || !Number.isFinite(number) ||
      (kind==="weight"?(number<30||number>350):(number < (pain?0:kind==="soreness"?0:1)||number>(pain?10:5)))) {
      setError("請先選擇評分或輸入有效數值。");return;
    }
    if((pain||kind==="soreness")&&!area){setError("請選擇部位。");return;}
    const severity=pain?painLevel(number,flags):undefined;
    if(save("記錄 "+kind,s=>{
      if(kind==="weight") {
        s.measurements.push({id:uid(),date,weight:number,createdAt:stamp(),
          supersedes:visibleMeasurements(s).filter(r=>r.date===date).at(-1)?.id});
      } else {
        (s.recoveryEntries??=[]).push({
          id:uid(),date,type:kind,unit:kind==="sleep"?"rating":undefined,
          value:number,area:area||undefined,side:(pain||kind==="soreness")?side:undefined,
          flags:pain?flags:[],safetyLevel:severity,createdAt:stamp(),
        });
      }
    })){
      notify("紀錄已儲存");
      close(); // On successful save the bottom sheet must always dismiss.
      if(severity&&severity>1)window.setTimeout(()=>window.alert(safetyText[severity]),50);
    }
  };
  return <Sheet title={pain?"疼痛安全紀錄":`${date} · 快速紀錄`} onClose={close}>
    {pain ? <div className="pain-guidance">
      <strong>疼痛不同於運動後肌肉痠痛</strong>
      <p>請先記錄疼痛位置和程度。胸痛、昏厥、突然無力、嚴重外傷或無法負重時，請停止活動並儘速尋求醫療協助。</p>
    </div> : <Field label="紀錄項目"><select value={kind} onChange={e=>{
      setKind(e.target.value as typeof kind);setScore(null);setWeight("");setArea("");setFlags([]);setError("");
    }}>
      <option value="sleep">睡眠品質</option><option value="fatigue">疲勞</option>
      <option value="stress">壓力</option><option value="soreness">肌肉痠痛</option>
      <option value="weight">體重</option>
    </select></Field>}
    <form onSubmit={saveLog} className="recovery-log-form">
      {kind==="weight" ? <Field label="本次體重 kg"><input type="number" inputMode="decimal" min="30" max="350" step=".1"
        placeholder="請輸入本次量測結果" value={weight} onChange={e=>setWeight(e.target.value)} required/></Field>
      : <fieldset className="recovery-rating">
        <legend>{pain?"疼痛程度（0–10）":kind==="sleep"?"睡眠品質（起床當天）":labels[kind]+"程度"}</legend>
        <p>{pain?"0 沒有疼痛 · 10 極嚴重":kind==="sleep"?"1 很差 · 5 很好（不代表睡眠時長）":"數字越高，感受越明顯"}</p>
        <div className={pain?"pain-rating-options":"rating-options"}>
          {Array.from({length:pain?11:kind==="soreness"?6:5},(_,i)=>pain||kind==="soreness"?i:i+1).map(n=>
            <label key={n} className={score===n?"selected":""}>
              <input type="radio" name="score" value={n} checked={score===n} onChange={()=>{setScore(n);setError("");}} required/>
              <span>{n}</span>
            </label>)}
        </div>
      </fieldset>}
      {(pain||kind==="soreness")&&<>
        <div className="form-grid">
          <Field label="身體部位"><select required value={area} onChange={e=>setArea(e.target.value)}>
            <option value="">請選擇部位</option>
            {(pain?painAreas:soreAreas).map(x=><option key={x}>{x}</option>)}
          </select></Field>
          <Field label="位置"><select value={side} onChange={e=>setSide(e.target.value)}>
            <option value="Both">雙側／中間</option><option value="Left">左側</option><option value="Right">右側</option>
          </select></Field>
        </div>
      </>}
      {pain&&<fieldset className="pain-flags">
        <legend>是否有以下情況？（可複選）</legend>
        {([
          ["red","突然劇痛、外傷、不能負重、胸痛、昏厥或明顯麻木／無力"],
          ["sharp","銳痛／關節痛，或動作時會代償"],
          ["worsening","疼痛持續或逐組加重"],
        ] as const).map(([id,label])=><label className="check" key={id}>
          <input type="checkbox" checked={flags.includes(id)} onChange={e=>setFlags(list=>e.target.checked?[...list,id]:list.filter(v=>v!==id))}/>{label}
        </label>)}
      </fieldset>}
      {error&&<p className="form-error" role="alert">{error}</p>}
      <div className="recovery-form-actions">
        <button type="button" className="button secondary" onClick={close}>取消</button>
        <button type="submit" className="button">儲存並關閉</button>
      </div>
    </form>
  </Sheet>;
}

export function RecoveryHistory(){
  const {state}=useStore();const entries=recoveryEntries(state);
  return <section className="stack"><h2>Recovery History</h2>
    {entries.slice().reverse().map(r=><div className="simple-row" key={r.id}>
      <span>{r.date} · {labels[r.type]} {r.area??""} {r.side??""}</span>
      <strong>{r.value}{r.type==="sleep"&&r.unit!=="rating"?" min":r.type==="pain"?"/10":"/5"}</strong>
    </div>)}{!entries.length&&<p>尚未紀錄</p>}
  </section>;
}

export function RecoveryEntryPoints({date,editableDate=false}:{date:string;editableDate?:boolean}){
  const {state}=useStore();
  const [logDate,setLogDate]=useState(date);
  const [kind,setKind]=useState<RecoveryEntry["type"]|null>(null);
  const records=latestRecovery(state,editableDate?logDate:date);
  return <section className="recovery-entry-points" aria-label="恢復紀錄入口">
    {editableDate&&<Field label="補記日期"><input type="date" value={logDate} onChange={e=>setLogDate(e.target.value||date)}/></Field>}
    <div className="recovery-entry-grid">
      {(["sleep","fatigue","soreness","stress"] as const).map(type=>{
        const entries=records.filter(r=>r.type===type);
        const value=entries.at(-1);
        return <button key={type} type="button" onClick={()=>setKind(type)}>
          <span>{labels[type]}</span><strong>{value?`${value.value}${type==="sleep"&&value.unit!=="rating"?" 分鐘（舊紀錄）":" / 5"}`:"尚未紀錄"}</strong>
          <small>{value?"新增本次評分 +":"點此填寫 +"}</small>
        </button>;
      })}
    </div>
    <button className="button secondary" type="button" onClick={()=>setKind("pain")}>記錄疼痛 · 安全評估</button>
    {kind&&<RecoveryQuickLog key={`${logDate}-${kind}`} initialKind={kind} date={editableDate?logDate:date}
      close={()=>setKind(null)} notify={()=>{}}/>}
  </section>;
}
