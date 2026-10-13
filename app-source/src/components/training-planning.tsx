"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { addDays, setDayType, type Cycle } from "@/lib/domain";
import {
  activeCycle,
  muscles,
  stages,
  muscleCompleted,
  scheduleKind,
  scheduleEntry,
  warmups,
  type MuscleTarget,
} from "@/lib/training-model";
import { nextDayIndex, dayId } from "@/lib/training-queue";
import { Field, Sheet, uid, stamp } from "./daily";
export function TrainingCalendar({ date }: { date: string }) {
  const { state, save } = useStore();
  const [month,setMonth]=useState(date.slice(0,7));
  const [selected,setSelected]=useState<string|null>(null);
  const plan = activeCycle(state),
    next = plan ? plan.days[nextDayIndex(state, plan)]?.name : "尚未設定";
  const first = month + "-01",
    length = new Date(
      Number(month.slice(0, 4)),
      Number(month.slice(5)),
      0,
    ).getDate(),
    weekStart = Number(state.preferences?.weekStart ?? 1),
    offset = (new Date(first + "T12:00:00Z").getUTCDay() - weekStart + 7) % 7;
  function change(n: number) {
    const d = new Date(first + "T12:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + n);
    setMonth(d.toISOString().slice(0, 7));
  }
  function put(
    kind: "train" | "rest",
    trainingDayId?: string,
    extra = false,
    cleared = false,
  ) {
    const syncNutrition = selected !== null && selected >= date &&
      window.confirm(`是否同時更新 ${selected} 的 Nutrition Day Type 為「${kind === "train" ? "訓練日" : "休息日"}」？\n確定＝同步 Nutrition；取消＝只修改 Training Calendar。`);
    if (
      save("更新單日安排", (s) => {
        (s.schedule ??= []).push({
          id: uid(),
          date: selected!,
          kind,
          trainingDayId,
          extra,
          cleared,
          source: "single",
          createdAt: stamp(),
        });
        if (syncNutrition) setDayType(s, selected!, kind === "train" ? "training" : "rest");
      })
    )
      setSelected(null);
  }
  return (
    <section className="calendar-section">
      <div className="card-head">
        <h2>{month}</h2>
        <div>
          <button
            className="icon-button"
            onClick={() => change(-1)}
            aria-label="上個月"
          >
            <ChevronLeft />
          </button>
          <button
            className="icon-button"
            onClick={() => change(1)}
            aria-label="下個月"
          >
            <ChevronRight />
          </button>
        </div>
      </div>
      <div className="month-grid">
        {Array.from({ length: 7 }, (_, i) => (
          <small key={i}>{"日一二三四五六"[(i + weekStart) % 7]}</small>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={"b" + i} />
        ))}
        {Array.from({ length }, (_, i) => {
          const d = addDays(first, i),
            explicit = state.schedule?.filter(item=>item.date===d && item.source==="single").at(-1),
            entry = explicit && !explicit.cleared ? explicit : null,
            done = state.sessions.some(
              (s) =>
                (s.workoutDate ?? s.date) === d && s.status === "completed",
            );
          return (
            <button
              key={d}
              className={`${entry?.kind === "rest" ? "rest-day" : ""} ${d === date ? "is-today" : ""}`}
              onClick={() => setSelected(d)}
            >
              <strong>{i + 1}</strong>
              <small>
                {done
                  ? "✓"
                  : !entry ? "未安排"
                  : entry.kind === "rest" ? "Rest"
                  : entry.trainingDayId
                    ? (plan?.days.find((x,j)=>dayId(plan,j)===entry.trainingDayId)?.name??"已移除")
                    : next}
              </small>
            </button>
          );
        })}
      </div>
      <p className="muted">
        日曆只呈現手動安排與已完成的紀錄；修改訓練日不會刪除歷史資料。
      </p>
      <p className="muted">直接點選日曆中的日期，為那一天安排訓練、休息或清除安排。不提供批次套用，不會覆寫既有歷史訓練。</p>
      {selected && (
        <Sheet title={selected} onClose={() => setSelected(null)}>
          <div className="action-list">
            <p>請選擇 ${selected} 的安排</p>
            <button type="button" onClick={() => put("rest")}>休息日</button>
            {plan?.days.map((d, i) => (
              <button
                key={dayId(plan, i)}
                onClick={() => put("train", dayId(plan, i))}
              >
                今天改練 {d.name}
              </button>
            ))}
            <button type="button" onClick={() => {
              if(save("清除單日訓練安排",draft=>{
                draft.schedule=(draft.schedule??[]).filter(r=>r.date!==selected || r.source==="batch");
                (draft.schedule??=[]).push({id:uid(),date:selected!,kind:"rest",cleared:true,source:"single",createdAt:stamp()});
              }))setSelected(null);
            }}>清除這天的安排</button>
          </div>
        </Sheet>
      )}
    </section>
  );
}
export function MuscleProgress({ cycle }: { cycle: Cycle }) {
  const { state } = useStore();
  return (
    <section>
      <div className="card-head">
        <h2>Muscle Volume</h2>
        <small>{cycle.stage ?? "Intensity"}</small>
      </div>
      {cycle.muscleTargets?.length ? (
        cycle.muscleTargets
          .slice()
          .sort((a, b) => Number(b.priority) - Number(a.priority))
          .map((m) => (
            <div className="muscle-row" key={m.muscle}>
              <span>
                {m.muscle}
                {m.priority ? " · Priority" : ""}
                <small>
                  {m.frequency} 次 / Cycle · Day{" "}
                  {m.allocation.map((i) => i + 1).join(", ") || "未分配"}
                </small>
              </span>
              <strong>
                {muscleCompleted(state, cycle, m.muscle)} / {m.target}
              </strong>
            </div>
          ))
      ) : (
        <p className="muted">到 Cycle 設定填寫各肌群目標組數。</p>
      )}
      <p className="muted">
        目前計入主要肌群的 Working Sets；RP / Drop 保留段落，不重複計組。
      </p>
    </section>
  );
}
export function MuscleEditor({
  value,
  onChange,
  dayCount,
}: {
  value: MuscleTarget[];
  onChange: (v: MuscleTarget[]) => void;
  dayCount: number;
}) {
  return (
    <details>
      <summary>肌群目標與優先順序</summary>
      <p className="muted">
        請依自己的課表填寫目標，未設定的肌群不套用預設訓練量。
      </p>
      {muscles.map((name) => {
        const m = value.find((m) => m.muscle === name) ?? {
          muscle: name,
          target: 0,
          frequency: 1,
          priority: false,
          allocation: [],
        };
        const update = (patch: Partial<MuscleTarget>) =>
          onChange([
            ...value.filter((x) => x.muscle !== name),
            { ...m, ...patch },
          ]);
        return (
          <fieldset key={name}>
            <legend>{name}</legend>
            <div className="form-grid">
              <Field label="Working Sets">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={m.target}
                  onChange={(e) => update({ target: Number(e.target.value) })}
                />
              </Field>
              <Field label="Frequency">
                <input
                  type="number"
                  min="1"
                  max={dayCount || 1}
                  value={m.frequency}
                  onChange={(e) =>
                    update({ frequency: Number(e.target.value) })
                  }
                />
              </Field>
              <label className="check">
                <input
                  type="checkbox"
                  checked={m.priority}
                  onChange={(e) => update({ priority: e.target.checked })}
                />
                Priority
              </label>
            </div>
            <div className="day-allocation">
              {Array.from({ length: dayCount }, (_, i) => (
                <label key={i}>
                  <input
                    type="checkbox"
                    checked={m.allocation.includes(i)}
                    onChange={(e) =>
                      update({
                        allocation: e.target.checked
                          ? [...m.allocation, i]
                          : m.allocation.filter((n) => n !== i),
                      })
                    }
                  />
                  Day {i + 1}
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
    </details>
  );
}
export function WarmupPicker({sessionId}:{sessionId?:string}){
  const {state,save}=useStore();
  const session=state.sessions.find(s=>s.id===sessionId);
  const selected=session?.warmupIds??state.warmupPreset??[];
  const [name,setName]=useState("");
  const [minutes,setMinutes]=useState("");
  const [editing,setEditing]=useState<string|null>(null);
  const [error,setError]=useState("");
  const custom=state.customWarmups??[];
  // Legacy warm-up identifiers are retained only for existing saved sessions.
  const historical=warmups.filter(w=>selected.includes(w.id)).map(w=>({id:w.id,name:w.name,minutes:w.minutes,archived:true}));
  const available=[...custom.filter(w=>!w.archived), ...custom.filter(w=>w.archived&&selected.includes(w.id)),...historical];
  const duration=available.filter(w=>selected.includes(w.id)).reduce((sum,w)=>sum+w.minutes,0);
  const setSelected=(id:string,on:boolean)=>{
    save("修改熱身安排",s=>{
      const ses=s.sessions.find(item=>item.id===sessionId);
      const base=ses?.warmupIds??s.warmupPreset??[];
      const next=on?[...new Set([...base,id])]:base.filter(k=>k!==id);
      if(ses)ses.warmupIds=next;else s.warmupPreset=next;
    });
  };
  function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();const trim=name.trim(),mins=Number(minutes);
    if(!trim||!Number.isFinite(mins)||mins<=0||mins>120){setError("請輸入熱身名稱與 1–120 分鐘。");return;}
    if(save(editing?"編輯自訂熱身":"新增自訂熱身",s=>{
      (s.customWarmups??=[]);
      if(editing){
        const item=s.customWarmups.find(w=>w.id===editing);
        if(item){item.name=trim;item.minutes=mins;}
      }else{
        const id=uid();
        s.customWarmups.push({id,name:trim,minutes:mins});
        const ses=s.sessions.find(x=>x.id===sessionId);
        if(ses)ses.warmupIds=[...(ses.warmupIds??[]),id];
        else s.warmupPreset=[...(s.warmupPreset??[]),id];
      }
    })){setName("");setMinutes("");setEditing(null);setError("");}
  }
  return <div className="warmup-editor">
    <h2>我的熱身</h2>
    <p className="muted">自訂暖身內容，不預設固定五個動作。可新增、修改、取消選取或移除；當次訓練可跳過。</p>
    <p className="muted">已選 {selected.length} 項 · 約 {duration} 分鐘</p>
    <div className="stack">{available.map(w=><section key={w.id} className="card warmup-row">
      <label className="check">
        <input type="checkbox" checked={selected.includes(w.id)} onChange={e=>setSelected(w.id,e.target.checked)}/>
        <span><strong>{w.name}</strong><br/><small>約 {w.minutes} 分鐘 {w.archived?"· 歷史項目":""}</small></span>
      </label>
      {!w.archived&&<div className="two-actions">
        <button type="button" className="text-link" onClick={()=>{setEditing(w.id);setName(w.name);setMinutes(String(w.minutes));}}>修改</button>
        <button type="button" className="text-link" onClick={()=>{
          if(!confirm(`從熱身選單移除「${w.name}」？舊訓練的紀錄不會刪除。`))return;
          save("移除自訂熱身",s=>{
            const item=s.customWarmups?.find(item=>item.id===w.id);
            if(item)item.archived=true;
            s.warmupPreset=(s.warmupPreset??[]).filter(k=>k!==w.id);
            if(sessionId){const ses=s.sessions.find(x=>x.id===sessionId);if(ses)ses.warmupIds=(ses.warmupIds??[]).filter(k=>k!==w.id);}
          });
        }}>移除</button>
      </div>}
    </section>)}</div>
    <form onSubmit={submit} className="card stack">
      <h3>{editing?"編輯熱身項目":"新增熱身項目"}</h3>
      <Field label="熱身名稱"><input value={name} maxLength={80} required placeholder="例如 肩關節活動" onChange={e=>setName(e.target.value)}/></Field>
      <Field label="預計時間（分鐘）"><input type="number" min="1" max="120" inputMode="numeric" value={minutes}
        placeholder="例如 5" onChange={e=>setMinutes(e.target.value)} required/></Field>
      {error&&<p className="form-error" role="alert">{error}</p>}
      <div className="two-actions">
        <button className="button" type="submit">{editing?"儲存修改":"＋ 加入熱身"}</button>
        {editing&&<button className="button secondary" type="button" onClick={()=>{setEditing(null);setName("");setMinutes("");}}>取消</button>}
      </div>
    </form>
  </div>;
}
