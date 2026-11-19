"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { activeCycle } from "@/lib/training-model";
import { dayId } from "@/lib/training-queue";
import { dateInZone, type Cycle } from "@/lib/domain";
import { PageTitle, Field, uid, stamp } from "./daily";
import templates from "@/content/training-templates.json";
import { PlanExercises } from "./plan-exercises";
import { PlanReview } from "./plan-review";
import { versionReview } from "@/lib/plan-version-review";
import {exerciseLibrary} from "@/lib/exercise-library";
export function TrainingPlan({ notify, startBlank = false }: { notify: (s?: string) => void; startBlank?: boolean }) {
  const { state, save } = useStore();
  const library=exerciseLibrary(state).filter(x=>x.usage==="training"||x.usage==="both");
  const router = useRouter();
  const current = activeCycle(state);
  const [name, setName] = useState(startBlank ? "My New Plan" : current?.name ?? "My Training Plan");
  const [days, setDays] = useState<Cycle["days"]>(
    () =>
      (!startBlank ? current?.days : undefined)?.map((d, i) => ({
        ...structuredClone(d),
        id: current ? dayId(current, i) : uid(),
      })) ?? [],
  );
  const [reviewOpen, setReviewOpen] = useState(false);
  const [baseVersion] = useState(current?.id);
  const [mobileEditor,setMobileEditor] = useState(false);
  const [template, setTemplate] = useState("");
  const [planSource, setPlanSource] = useState<"custom" | "template">(
    startBlank || current?.source === "custom" ? "custom" : "template",
  );
  // Stable ID keeps the user's day in focus through edits and reordering.
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const activeIndex = days.findIndex((day) => day.id === activeDayId);
  const selectedIndex = activeIndex < 0 ? 0 : activeIndex;
  const selectDay = (index: number) => {
    if (index >= 0 && index < days.length) {setActiveDayId(days[index].id ?? null);setMobileEditor(true);}
  };

  function preset(selected:string) {
    if (days.length && !window.confirm("依選擇的分化帶入課表？未儲存的修改會被新的分化取代，已完成的訓練紀錄不受影響。")) return;
    setTemplate(selected);
    if (selected === "自訂空白") {
      setPlanSource("custom");
      setDays([]);
      setActiveDayId(null);
      return;
    }
    setPlanSource("template");
    const imported = templates[selected as keyof typeof templates].map(day => ({
      ...structuredClone(day), id: uid(),
    }));
    setDays(imported);
    setActiveDayId(imported[0]?.id ?? null);
  }
  return (
    <div className={"daily-page plan-workspace"+(mobileEditor?" day-focused":"")}>
      <PageTitle title="Training Plan" />
      <section className="cycle-overview"><h2>{name}</h2>
        <a href={(process.env.NEXT_PUBLIC_BASE_PATH ?? "") + "/training/calendar/"}>訓練行事曆</a>
        <nav aria-label="週期訓練日">{days.map((day,i) =>
          <button type="button" key={day.id} aria-pressed={i === selectedIndex} onClick={() => selectDay(i)}>
            Day {i+1} · {day.name}</button>)}</nav>
      </section>

      <Field label="選擇訓練分化（選取後直接帶入，可自行修改或刪除動作）">
        <select aria-label="選擇分化" value={template} onChange={e=>preset(e.target.value)}>
          <option value="">請選擇分化（目前課表可直接編輯）</option>
          <option value="Upper / Lower">Upper / Lower · 上下半身</option>
          <option value="PPL">PPL · 推拉腿</option>
          <option value="五分化">五分化</option>
          <option value="自訂空白">自訂空白課表</option>
        </select>
      </Field>
      {template==="五分化"&&<p className="muted">請依自己的訓練量與恢復狀態調整，所有動作皆可刪除或修改。</p>}
      <Field label="計畫名稱">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
        />
      </Field>
      <section className="plan-day-navigation" aria-label="切換訓練日">
        {days.length > 0 ? (
          <>
            <div className="plan-day-navigation-heading">
              <span>訓練日</span>
              <span>{selectedIndex + 1} / {days.length}</span>
            </div>
            <div className="plan-day-navigation-controls">
              <button type="button" className="plan-day-arrow" aria-label="上一個訓練日"
                disabled={selectedIndex === 0} onClick={() => selectDay(selectedIndex - 1)}>←</button>
              <select aria-label="目前訓練日" value={days[selectedIndex]?.id ?? ""}
                onChange={(e) => setActiveDayId(e.target.value)}>
                {days.map((day, index) => (
                  <option key={day.id ?? index} value={day.id}>
                    Day {index + 1} · {day.name || "未命名訓練日"}
                  </option>
                ))}
              </select>
              <button type="button" className="plan-day-arrow" aria-label="下一個訓練日"
                disabled={selectedIndex === days.length - 1} onClick={() => selectDay(selectedIndex + 1)}>→</button>
            </div>
          </>
        ) : <p className="muted">目前沒有訓練日，請先選擇分化或新增一天。</p>}
        <button type="button" className="plan-day-add"
          onClick={() => {
            const id = uid();
            setDays([...days, {id, name: "自訂訓練日", exercises: []}]);
            setActiveDayId(id);setMobileEditor(true);
          }}>＋ 新增訓練日</button>
      </section>
      {days.map((day, i) => ({day, i})).filter(({i}) => i === selectedIndex).map(({day, i}) => (
        <section className="card stack plan-day-editor" key={day.id}>
          <button className="day-back" type="button" onClick={()=>setMobileEditor(false)}>返回週期總覽</button>
          <Field label={`訓練日 ${i + 1}`}>
            <input
              value={day.name}
              onChange={(e) =>
                setDays(
                  days.map((d, j) =>
                    i === j ? { ...d, name: e.target.value } : d,
                  ),
                )
              }
            />
          </Field>
          <Field label="訓練日備註（選填）"><textarea maxLength={500} value={day.notes ?? ""}
            onChange={e=>setDays(days.map((d,j)=>i===j?{...d,notes:e.target.value}:d))}/></Field>
          {planSource === "custom" && (
            <div className="plan-second-session stack">
              <label className="check">
                <input type="checkbox" checked={!!day.secondSession}
                  onChange={e => setDays(days.map((d,j) => i !== j ? d : {
                    ...d,
                    secondSession:e.target.checked
                      ? { name:"第二場訓練", exercises:[] } : undefined,
                  }))} />
                同一天安排第二場訓練（此自訂課表的 Cycle Day）
              </label>
              {day.secondSession && (
                <div className="stack">
                  <p className="muted">兩場各自儲存；第二場不會重複推進 Cycle。完成第一場後可從 Training 開始第二場。</p>
                  <Field label="第二場名稱">
                    <input maxLength={80} value={day.secondSession.name}
                      onChange={e => setDays(days.map((d,j) => i !== j ? d : ({
                        ...d, secondSession:{...d.secondSession!,name:e.target.value},
                      })))} />
                  </Field>
                  <PlanExercises label="第二場" items={library} rows={day.secondSession.exercises ?? []}
                    change={exercises => setDays(days.map((d,n) => n===i ? {...d,secondSession:{...d.secondSession!,exercises}} : d))}/>
                  {!day.secondSession.exercises?.length && (
                    <p className="muted" role="status">請先為第二場加入至少一個動作才能儲存。</p>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="two-actions">
            <button
              className="button secondary"
              disabled={!i}
              onClick={() => {
                const copy = [...days];
                [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
                setActiveDayId(day.id ?? null);
                setDays(copy);
              }}
            >
              上移
            </button>
            <button
              className="button secondary"
              disabled={i === days.length - 1}
              onClick={() => {
                const copy = [...days];
                [copy[i], copy[i + 1]] = [copy[i + 1], copy[i]];
                setActiveDayId(day.id ?? null);
                setDays(copy);
              }}
            >
              下移
            </button>
            <button
              className="button danger"
              onClick={() => {
                if (confirm("從此計畫移除這個訓練日？歷史訓練保留。")) {
                  const remaining = days.filter((_, j) => j !== i);
                  setDays(remaining);
                  setActiveDayId(remaining[Math.min(i, remaining.length - 1)]?.id ?? null);
                }
              }}
            >
              刪除訓練日
            </button>
          </div>
          <PlanExercises label="第一場" items={library} rows={day.exercises ?? []}
            change={exercises=>setDays(days.map((d,n)=>n===i?{...d,exercises}:d))}/>
        </section>
      ))}

      <p className="muted">模板只是快速起點。訓練日與動作可自由增刪、排序；新計畫版本不會覆寫已保存的 Session。</p>
      <button
        className="button"
        disabled={
          !days.length || !name.trim() || days.some((d) =>
            !d.name.trim() || (d.secondSession &&
              (!d.secondSession.name.trim() || !d.secondSession.exercises?.length)))
        }
        onClick={() => setReviewOpen(true)}>
        檢閱變更
      </button>
      {reviewOpen && <PlanReview state={state} days={days} name={name} close={()=>setReviewOpen(false)} confirm={()=> {
          if (
            save("儲存 Training Plan 新版本", (s) => {
              const old = activeCycle(s);
              for (const day of days) {
                for (const exercise of [...(day.exercises ?? []), ...(day.secondSession?.exercises ?? [])]) {
                  if (!exercise.reps.trim() || !Number.isInteger(exercise.sets) || exercise.sets < 1 ||
                      exercise.sets > 100 || !Number.isInteger(exercise.restSeconds) ||
                      exercise.restSeconds < 1 || exercise.restSeconds > 3600 ||
                      (exercise.targetRir !== undefined && (!Number.isInteger(exercise.targetRir) ||
                        exercise.targetRir < 0 || exercise.targetRir > 10)))
                    throw Error(day.name + " · " + exercise.name + " 的訓練目標無效，請返回編輯。");
                }
              }
              if (old?.id !== baseVersion) throw Error("課表已有新版本，請重新開啟編輯器並比對變更。");
              const review = versionReview(s,days,dateInZone(s.profile?.timezone));
              (s.cycles ??= []).push({
                id: uid(),
                name: name.trim(),
                source: planSource,
                days:structuredClone(days).map(day=>({
                  ...day,
                  exercises:day.exercises?.map(({rir, ...exercise})=>exercise),
                  secondSession:day.secondSession?{
                    ...day.secondSession,
                    exercises:day.secondSession.exercises?.map(({rir,...exercise})=>exercise),
                  }:undefined,
                })),
                pending: review.pending,
                round: review.nextRound,
                muscleTargets: old?.muscleTargets ? structuredClone(old.muscleTargets) : undefined,
                previousId: old?.id,
                stage: old?.stage ?? "Intensity",
                createdAt: stamp(),
              });
            })
          )
            { notify("課表已儲存"); router.push("/training"); }
      }}/>}
      {current && (
        <p className="muted">
          目前版本 {current.createdAt.slice(0, 16).replace("T", " ")} ·{" "}
          {current.days.length} 個訓練日
        </p>
      )}
    </div>
  );
}
