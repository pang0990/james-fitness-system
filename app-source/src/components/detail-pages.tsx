"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import catalog from "@/content/exercises.json";
import {exerciseLibrary} from "@/lib/exercise-library";
import { PageTitle, Sheet, Field, Num, stamp, uid } from "./daily";
import {correctCompletedSet} from "@/lib/workout-sets";
import type {Segment} from "@/lib/domain";

export function WorkoutHistoryDetail() {
  const { state, save } = useStore();
  const [editing,setEditing]=useState<{exerciseId:string;setId:string}|null>(null);
  const [id, setId] = useState<string | null>(null);
  useEffect(() => setId(new URLSearchParams(window.location.search).get("id")), []);
  const sessions = state.sessions.filter(s => s.status !== "in_progress").slice().reverse();
  const session = sessions.find(s => s.id === id);
  const editExercise=session?.exercises.find(e=>e.id===editing?.exerciseId);
  const editSet=editExercise?.sets.find(s=>s.id===editing?.setId);
  return (
    <div className="daily-page">
      <PageTitle title={session ? session.name : "Workout History"} />
      <Link className="text-link" href="/training/history">← 返回歷史紀錄</Link>
      {session ? (
        <>
          <section className="card stack">
            <small>{session.workoutDate ?? session.date}</small>
            <strong>{session.status === "discarded" ? "已放棄" : "已完成"}</strong>
            <p className="muted">依當次 Session 保存的實際紀錄呈現，不使用現在的 Plan 自動補齊組數。</p>
            <p>實際完成組數：{session.exercises.reduce((a, e) => a + e.sets.filter(t => t.type === "working").length, 0)}</p>
            {session.activeDuration !== undefined && <p>Active Training：{Math.round(session.activeDuration / 60000)} 分鐘</p>}
            {session.feedback && <p>當次回饋：{session.feedback}</p>}
          </section>
          {session.exercises.map((ex) => (
            <section className="card stack" key={ex.id}>
              <h2>{ex.name}</h2>
              <p className="muted">Target Sets：{ex.plannedSets ?? "未提供"} · Target Reps：{ex.reps ?? "未提供"}</p>
              {ex.sets.length ? ex.sets.map((set, i) => (
                <div className="simple-row" key={set.id}>
                  <span>{i+1}. {set.type}</span>
                  <span>{set.weight} kg × {set.reps}</span>
                  {session.status==="completed" && <button type="button" className="text-link"
                    onClick={()=>setEditing({exerciseId:ex.id,setId:set.id})}>更正</button>}
                </div>
              )) : <p className="muted">沒有完成的組數。</p>}
              <Link className="text-link" href={`/progress/training/exercises?name=${encodeURIComponent(ex.name)}`}>查看此動作長期紀錄 →</Link>
            </section>
          ))}
          {session.setCorrections?.length ? <section className="card stack">
            <details className="history-corrections">
              <summary>歷史組次更正紀錄 · {session.setCorrections.length} 筆</summary>
              {session.setCorrections.map(change=><div className="simple-row" key={change.id}>
                <span>{new Date(change.editedAt).toLocaleString("zh-TW")} · {session.exercises.find(e=>e.id===change.exerciseId)?.name ?? "動作"}<br/>
                {change.before.weight} kg × {change.before.reps} ({change.before.type})
                {" → "}
                {change.after.weight} kg × {change.after.reps} ({change.after.type})</span>
              </div>)}
            </details>
          </section> : null}
          {session.status==="completed" && editing && editSet && editExercise && (
            <Sheet title="更正歷史組次" onClose={()=>setEditing(null)}>
              <p className="muted">更正只修改本場紀錄；原數值與更正時間會保留在修改紀錄中。</p>
              <form className="stack" key={editSet.id} onSubmit={event=>{
                event.preventDefault();
                const data=new FormData(event.currentTarget);
                const weight=Number(data.get("weight")),reps=Number(data.get("reps"));
                const type=String(data.get("type")) as Segment["type"];
                if(save("更正歷史訓練組次",draft=>{
                  const target=draft.sessions.find(s=>s.id===session.id);
                  if(!target)throw Error("找不到訓練紀錄");
                  correctCompletedSet(target,editExercise.id,editSet.id,
                    {weight,reps,type},stamp(),uid());
                }))setEditing(null);
              }}>
                <Field label="組型"><select name="type" defaultValue={editSet.type}>
                  {editSet.parentId?<>
                    <option value="rp">Rest-Pause</option><option value="drop">Drop Set</option>
                  </>:<>
                    <option value="working">Working Set</option>
                    <option value="warmup">Warm-up</option>
                    <option value="rampup">Ramp-up</option>
                  </>}
                </select></Field>
                <Num label="重量 kg" name="weight" max={1000} value={editSet.weight}/>
                <Num label="次數" name="reps" min={1} max={500} step="1" value={editSet.reps}/>
                <button type="submit" className="button">儲存更正</button>
              </form>
            </Sheet>
          )}
        </>
      ) : (
        <section className="card stack">
          <h2>選擇歷史訓練</h2>
          {!sessions.length && <p className="muted">尚未有訓練歷史。</p>}
          {sessions.map(s => (
            <Link className="simple-row" key={s.id} href={`/training/history/session?id=${encodeURIComponent(s.id)}`}>
              {s.workoutDate ?? s.date} · {s.name} <span>→</span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}

export function ExerciseGuideDetail() {
  const {state}=useStore();
  const [angle,setAngle]=useState<"front"|"side"|"angle45"|"rear">("front");
  const [id, setId] = useState<string | null>(null);
  useEffect(() => setId(new URLSearchParams(window.location.search).get("id")), []);
  const exercise = exerciseLibrary(state).find(e => e.id === id);
  const original=catalog.find(e=>e.id===id);
  const angles=[{key:"front",label:"正面"},{key:"side",label:"側面"},
    {key:"angle45",label:"45°"},{key:"rear",label:"背面"}] as const;
  const safeVideo=(raw?:string)=>{
    if(!raw)return undefined;
    // Only video URLs controlled by a content editor should be published.
    if(raw.startsWith("https://")||raw.startsWith("/james-fitness-system/"))return raw;
    return undefined;
  };
  const video=safeVideo(exercise?.videoAngles?.[angle]);
  return (
    <div className="daily-page">
      <PageTitle title={exercise?.nameZh ?? "動作詳情"} />
      <Link className="text-link" href="/training/exercises">← 返回動作資料庫</Link>
      {exercise ? (
        <section className="card stack">
          <small>{exercise.visibility==="public"?"JFS 公開動作 · 所有使用者可觀看":"我的私人動作"}</small>
          <h2>{exercise.name}</h2>
          <p>主要肌群：{exercise.muscle}</p>
          <p>品牌：{exercise.brand||"未設定"} · 器材：{exercise.equipment}</p>
          <div className="exercise-video-placeholder">
            {video ? <video key={video} controls playsInline preload="metadata"
              src={video} aria-label={exercise.nameZh+" · "+angles.find(a=>a.key===angle)?.label+"示範影片"}/>
              : <strong>{angles.find(a=>a.key===angle)?.label}示範影片待補上</strong>}
            <div className="exercise-video-angles" role="group" aria-label="選擇示範角度">
              {angles.map(item=>(
                <button key={item.key} type="button"
                  className={"button secondary"+(item.key===angle?" active":"")}
                  aria-pressed={angle===item.key} onClick={()=>setAngle(item.key)}>
                  {item.label}{safeVideo(exercise.videoAngles?.[item.key])?" ▶":" · 待補上"}
                </button>
              ))}
            </div>
          </div>
          <p className="muted">未附正式影片與審核說明前不顯示未經確認的動作教學。</p>
          {original?.sourceUrl && <a href={original.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-link">器材來源 ↗</a>}
          <Link href="/training/plan" className="button secondary">開啟課表，加入／編輯動作</Link>
          <Link href={`/progress/training/exercises?name=${encodeURIComponent(exercise.name)}`} className="text-link">查看訓練紀錄 →</Link>
        </section>
      ) : (
        <section className="card stack">
          <p className="muted">選擇一個動作查看詳情：</p>
          {exerciseLibrary(state).map(e => (
            <Link className="simple-row" key={e.id} href={`/training/exercises/detail?id=${encodeURIComponent(e.id)}`}>
              {e.nameZh} <small>{e.brand}</small> <span>→</span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}

export function ExerciseProgressDetail() {
  const { state } = useStore();
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const match = catalog.find(e => e.id === params.get("id"));
    setName(params.get("name") || match?.name || null);
  }, []);
  const sessions = state.sessions.filter(s => s.status === "completed");
  const exercises = Array.from(new Set(sessions.flatMap(s => s.exercises.map(e => e.name)))).sort();
  const points = sessions.flatMap(s => s.exercises.filter(e => e.name === name).map(e => ({
    id: s.id, date: s.workoutDate ?? s.date, sets: e.sets.filter(t => t.type === "working"),
  }))).sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div className="daily-page">
      <PageTitle title={name ? name + " · Progress" : "Exercise Progress"} />
      <Link className="text-link" href="/progress/training">← 返回訓練分析</Link>
      {!name ? (
        <section className="card stack">
          <h2>選擇要追蹤的動作</h2>
          {exercises.length ? exercises.map(ex => (
            <Link className="simple-row" key={ex} href={`/progress/training/exercises?name=${encodeURIComponent(ex)}`}>{ex} <span>→</span></Link>
          )) : <p className="muted">尚未有可供比較的已完成訓練。</p>}
        </section>
      ) : (
        <>
          <p className="muted">以下為已完成 Session 的原始 Working Sets，不把目標組數當成實際完成，也不根據單筆資料自動判定 Improving。</p>
          {!points.length && <p className="muted">這個動作還沒有歷史訓練紀錄。</p>}
          {points.map(point => (
            <section className="card stack" key={point.id}>
              <h2>{point.date}</h2>
              {point.sets.length ? point.sets.map((set,i) => (
                <div className="simple-row" key={set.id}>
                  <span>Working {i+1}</span><span>{set.weight} kg × {set.reps} · RIR {set.rir ?? "—"}</span>
                </div>
              )) : <p className="muted">無有效 Working Set。</p>}
              <Link href={`/training/history/session?id=${encodeURIComponent(point.id)}`} className="text-link">查看當次完整紀錄 →</Link>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
