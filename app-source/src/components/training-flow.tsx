"use client";
import Link from "next/link";
import { TrainingPlan } from "./training-plan";
import {
  dayId,
  pendingIds,
  nextDayIndex,
  consumeDay,
  completeSession,
} from "@/lib/training-queue";
import { navigateWithMotion } from "./navigation-motion";
import {
  TrainingCalendar,
  MuscleProgress,
  MuscleEditor,
  WarmupPicker,
} from "./training-planning";
import {
  activeCycle,
  type MuscleTarget,
  stages,
  scheduleEntry,
  cycleProgressEvents,
} from "@/lib/training-model";
import { Companion } from "./companion";
import catalog from "@/content/exercises.json";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Dumbbell,
  Plus,
  Timer,
  Pause,
  Play,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { addDays, type Segment } from "@/lib/domain";
import { PageTitle, Sheet, Field, Num, uid, stamp } from "./daily";
export function TrainingFlow({
  date,
  path,
  notify,
}: {
  date: string;
  path: string;
  notify: (s?: string) => void;
}) {
  const { state, save } = useStore();
  const router = useRouter();
  const [exercise, setExercise] = useState(() =>
    typeof window !== "undefined"
      ? Number(
          sessionStorage.getItem(
            "james-exercise-" +
              state.sessions.find((s) => s.status === "in_progress")?.id,
          ) ?? 0,
        )
      : 0,
  );
  const [add, setAdd] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  const [review, setReview] = useState(false);
  const [completedId, setCompletedId] = useState<string | null>(null);
  const [type, setType] = useState<Segment["type"]>("working");
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [undoDeletion, setUndoDeletion] = useState<{
    sessionId:string; exerciseId:string; removed:Segment[]; indices:number[];
  } | null>(null);
  const [setRecorded, setSetRecorded] = useState(false);
  const [entryVersion, setEntryVersion] = useState(0);
  const submitLock = useRef(false);
  const [skip, setSkip] = useState(false);
  const [timerEnd, setTimerEnd] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const cycle = activeCycle(state);
  const count = cycle ? cycleProgressEvents(state,cycle.id).length : 0;
  const planned = scheduleEntry(state, date);
  const selectedIndex =
    cycle?.days.findIndex(
      (d, i) => dayId(cycle, i) === planned.trainingDayId,
    ) ?? -1;
  const dayIndex = cycle
    ? selectedIndex >= 0
      ? selectedIndex
      : Math.max(0, nextDayIndex(state, cycle))
    : 0;
  const day = cycle?.days[dayIndex];
  const current = state.sessions.find((s) => s.status === "in_progress");
  const completedToday = state.sessions
    .filter(s => s.status === "completed" && (s.workoutDate ?? s.date) === date)
    .slice().sort((a,b) => (a.completedAt ?? a.createdAt).localeCompare(b.completedAt ?? b.createdAt));
  // A custom Cycle day can have an optional second session, without consuming another day.
  const plannedSecondFor = completedToday.find(session => {
    if (!session.cycleId || !session.trainingDayId || session.isExtra) return false;
    const plan = state.cycles?.find(c => c.id === session.cycleId);
    const sourceDay = plan?.days.find((_,i) => dayId(plan,i) === session.trainingDayId);
    return !!sourceDay?.secondSession &&
      !state.sessions.some(s => s.parentSessionId === session.id && s.status !== "discarded");
  });
  const plannedSource = plannedSecondFor?.cycleId
    ? state.cycles?.find(c => c.id === plannedSecondFor.cycleId) : undefined;
  const plannedSecond = plannedSource?.days.find((_,i) =>
    dayId(plannedSource,i) === plannedSecondFor?.trainingDayId)?.secondSession;
  useEffect(() => {
    if (current)
      sessionStorage.setItem("james-exercise-" + current.id, String(exercise));
  }, [exercise, current?.id]);
  useEffect(() => {
    if (current && exercise >= current.exercises.length) setExercise(0);
  }, [current?.id, current?.exercises.length, exercise]);
  const ex = current?.exercises[exercise];
  useEffect(() => { setRecorded(false); setEntryVersion(v=>v+1); }, [ex?.id,current?.id]);
  const editingSet = ex?.sets.find(s=>s.id===editingSetId);
  function deleteRecordedSet(id:string){
    if(!current || !ex) return;
    const root=ex.sets.find(s=>s.id===id);
    if(!root)return;
    const removed=ex.sets.filter(s=>s.id===id || s.parentId===id);
    if(removed.length>1 && !window.confirm("刪除這一組會一併移除其 RP／Drop 延伸組，確定？"))return;
    const indices=removed.map(s=>ex.sets.findIndex(t=>t.id===s.id));
    if(save("刪除訓練組",draft=>{
      const target=draft.sessions.find(s=>s.id===current.id)!.exercises.find(e=>e.id===ex.id)!;
      const ids=new Set(removed.map(s=>s.id));
      target.sets=target.sets.filter(s=>!ids.has(s.id));
    }))setUndoDeletion({sessionId:current.id,exerciseId:ex.id,
      removed:structuredClone(removed),indices});
  }
  const previousSets = state.sessions
    .filter((s) => s.status === "completed")
    .slice()
    .reverse()
    .flatMap((s) => s.exercises)
    .find((e) => e.name === ex?.name)
    ?.sets.filter((s) => s.type === "working");
  const previous = previousSets?.at(-1);
  const workout = path === "training/session" && !!current;
  useEffect(() => {
    const raw = sessionStorage.getItem("james-rest-end");
    if (raw && Number(raw) > Date.now()) setTimerEnd(Number(raw));
  }, []);
  useEffect(() => {
    if (!timerEnd) return;
    const update = () => {
      const left = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
      setRemaining(left);
      if (!left) {
        setTimerEnd(null);
        sessionStorage.removeItem("james-rest-end");
      }
    };
    update();
    const t = setInterval(update, 500);
    return () => clearInterval(t);
  }, [timerEnd]);
  useEffect(() => {
    if (!workout || state.preferences?.keepAwake === false) return;
    let lock: WakeLockSentinel | undefined;
    let cancelled = false;
    async function acquire() {
      try {
        if (
          document.visibilityState !== "visible" ||
          !("wakeLock" in navigator)
        )
          return;
        const held = await navigator.wakeLock.request("screen");
        if (cancelled) await held.release();
        else lock = held;
      } catch {}
    }
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      cancelled = true;
      lock?.release();
      document.removeEventListener("visibilitychange", acquire);
    };
  }, [workout, state.preferences?.keepAwake]);
  function startTimer() {
    const end =
      Date.now() +
      Number(ex?.restSeconds ?? state.preferences?.restSeconds ?? 120) * 1000;
    sessionStorage.setItem("james-rest-end", String(end));
    setTimerEnd(end);
  }
  function startPlannedSecond() {
    if (current || !plannedSecondFor || !plannedSecond) return;
    const origin = plannedSecondFor;
    if (save("開始自訂課表第二場", draft => {
      if (draft.sessions.some(s => s.status === "in_progress" ||
        (s.parentSessionId === origin.id && s.status !== "discarded"))) return;
      draft.sessions.push({
        id:uid(),date,name:plannedSecond.name,
        status:"in_progress",isExtra:true,sessionPart:"second",
        parentSessionId:origin.id,
        phase:state.preferences?.warmupDefault === "skip" ? "workout" : "warmup",
        cycleId:origin.cycleId,trainingDayId:origin.trainingDayId,
        workoutDate:date,scheduledDate:date,round:origin.round,
        exercises:(plannedSecond.exercises??[]).map(ex=>({
          ...ex,id:uid(),plannedSets:ex.sets,sets:[],
        })),
        warmupIds:[...(draft.warmupPreset??[])],createdAt:stamp(),
      });
    })) {
      setExercise(0);
      navigateWithMotion(router.push,"/training/session");
      notify("第二場訓練已建立");
    }
  }
  function startExtra(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (current) return;
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    if (!name) return;
    const selectedDay = Number(data.get("templateDay"));
    const fromDay = cycle && Number.isInteger(selectedDay) && selectedDay >= 0
      ? cycle.days[selectedDay] : undefined;
    if (save("新增單次額外訓練", draft => {
      if (draft.sessions.some(s => s.status === "in_progress")) return;
      draft.sessions.push({
        id:uid(),date,name,status:"in_progress",
        isExtra:true,sessionPart:"extra",
        phase:state.preferences?.warmupDefault === "skip" ? "workout" : "warmup",
        workoutDate:date,scheduledDate:date,
        // Ad-hoc exercises are not associated with, or counted by, Cycle progression.
        exercises:(fromDay?.exercises??[]).map(ex=>({
          ...ex,id:uid(),plannedSets:ex.sets,sets:[],
        })),
        warmupIds:[...(draft.warmupPreset??[])],createdAt:stamp(),
      });
    })) {
      setExtraOpen(false);
      setExercise(0);
      navigateWithMotion(router.push,"/training/session");
      notify("額外訓練已建立");
    }
  }
  function start() {
    if (current || !cycle || !day) return;
    if (
      save("開始 Cycle 訓練", (s) => {
        if (s.sessions.some((x) => x.status === "in_progress")) return;
        s.sessions.push({
          id: uid(),
          date,
          name: `Day ${dayIndex + 1} · ${day.name}`,
          status: "in_progress",
          sessionPart:planned.extra ? "extra" : "main",
          phase:
            state.preferences?.warmupDefault === "skip" ? "workout" : "warmup",
          cycleId: cycle.id,
          trainingDayId: dayId(cycle, dayIndex),
          isExtra:
            !!planned.extra ||
            !pendingIds(state, cycle).includes(dayId(cycle, dayIndex)),
          workoutDate: date,
          scheduledDate: date,
          round: cycle.round ?? 1,
          cycleDayIndex: dayIndex,
          exercises: (day.exercises ?? []).map((e) => ({
            ...e,
            id: uid(),
            plannedSets: e.sets,
            sets: [],
          })),
          warmupIds: [...(s.warmupPreset ?? [])],
          createdAt: stamp(),
        });
      })
    ) {
      navigateWithMotion(router.push, "/training/session");
      notify();
    }
  }
  if (path === "training/plan" || path === "training/plan/new") return <TrainingPlan notify={notify} startBlank={path === "training/plan/new"} />;
  if (path === "training/calendar")
    return (
      <div className="daily-page">
        <PageTitle title="Training Calendar" />
        <TrainingCalendar date={date} />
      </div>
    );
  if (path === "training/history")
    return (
      <div className="daily-page">
        <PageTitle title="Workout History" />
        {state.sessions
          .filter((s) => s.status !== "in_progress")
          .slice()
          .reverse()
          .map((s) => (
            <details className="card" key={s.id}>
              <summary>
                {s.workoutDate ?? s.date} · {s.name} ·{" "}
                {s.status === "discarded" ? "已放棄" : "已完成"}
              </summary>
              <div className="workout-history-actions">
                <Link className="text-link" href={`/training/history/session?id=${encodeURIComponent(s.id)}`}>查看單次訓練詳情 →</Link>
                <button type="button" className="button secondary" onClick={e=>{
                  e.preventDefault();
                  if(!window.confirm(`確定刪除 ${s.workoutDate??s.date}「${s.name}」的實際訓練紀錄？\n這會移除完成組數和該次進步資料，且無法復原。請先備份重要紀錄。`))return;
                  if(save("刪除單次歷史訓練",draft=>{
                    draft.sessions=draft.sessions.filter(item=>item.id!==s.id);
                    draft.cycleEvents=(draft.cycleEvents??[]).filter(ev=>ev.sessionId!==s.id);
                    // Do not change a current or future plan's pending-day sequence implicitly.
                  }))notify("這筆歷史訓練已刪除");
                }}>刪除這次訓練</button>
              </div>
              {s.exercises.map((e) => (
                <div key={e.id}>
                  <h3>{e.name}</h3>
                  {e.sets.map((t) => (
                    <p key={t.id}>
                      {t.type} · {t.weight} kg × {t.reps}
                    </p>
                  ))}
                </div>
              ))}
            </details>
          ))}
      </div>
    );
  if (completedId) {
    const finished = state.sessions.find((s) => s.id === completedId)!;
    const sets = finished.exercises
      .flatMap((e) => e.sets)
      .filter((t) => t.type === "working").length;
    const minutes = Math.max(
      0,
      Math.round(
        (finished.activeDuration ??
          Date.parse(finished.completedAt!) - Date.parse(finished.createdAt)) /
          60000,
      ),
    );
    return (
      <div className="daily-page workout-success">
        <p className="eyebrow">WORKOUT COMPLETE</p>
        <h1>訓練完成</h1>
        <Companion state="celebrating" onTap={() => {}} />
        <p>
          {sets} WORKING SETS · {minutes} MIN
        </p>
        <Link href="/today" className="button">
          Back to Today
        </Link>
        <Link href="/training" className="text-link">
          查看下一個訓練日 →
        </Link>
      </div>
    );
  }
  if (path === "training/warmups")
    return (
      <div className="daily-page">
        <PageTitle title="Warm-up Library" />
        <WarmupPicker />
      </div>
    );
  if (path === "training/exercises")
    return (
      <div className="daily-page">
        <PageTitle title="Exercise Library" />
        <Link className="text-link" href="/training">
          ← Training
        </Link>
        <ExerciseCatalog />
      </div>
    );
  return (
    <div className={`daily-page ${workout ? "workout-page" : ""}`}>
      <PageTitle title={workout ? "Workout" : "Training"}>
        {workout ? (
          <Link href="/training" className="text-link">
            暫離訓練
          </Link>
        ) : null}
      </PageTitle>
      {workout ? (
        <>
          <div className="workout-heading">
            <button
              className="button secondary"
              onClick={() =>
                save(current.pausedAt ? "恢復訓練" : "暫停訓練", (s) => {
                  const x = s.sessions.find((x) => x.id === current.id)!;
                  if (x.pausedAt) {
                    x.pausedDuration =
                      (x.pausedDuration ?? 0) +
                      Date.now() -
                      Date.parse(x.pausedAt);
                    delete x.pausedAt;
                  } else x.pausedAt = stamp();
                })
              }
            >
              {current.pausedAt ? "繼續訓練" : "暫停訓練"}
            </button>
            <span>
              {current.name} ·{" "}
              {Math.floor(
                Math.max(
                  0,
                  (current.pausedAt ? Date.parse(current.pausedAt) : clock) -
                    Date.parse(current.createdAt) -
                    (current.pausedDuration ?? 0),
                ) / 60000,
              )}{" "}
              MIN
            </span>
            <span>
              {current.phase === "warmup"
                ? "1 / 3 暖身"
                : review
                  ? "3 / 3 回顧"
                  : "2 / 3 訓練"}
            </span>
          </div>
          {current.phase === "warmup" ? (
            <section className="card">
              <WarmupPicker sessionId={current.id} />
              <p className="muted">
                完成自己的暖身後進入訓練；暖身組可在動作中記錄。
              </p>
              <div className="two-actions">
                <button
                  className="button"
                  onClick={() =>
                    save("完成暖身", (s) => {
                      s.sessions.find((x) => x.id === current.id)!.phase =
                        "workout";
                    })
                  }
                >
                  完成暖身
                  <Check size={16} />
                </button>
                <button
                  className="button secondary"
                  onClick={() =>
                    save("選擇略過暖身", (s) => {
                      s.sessions.find((x) => x.id === current.id)!.phase =
                        "workout";
                    })
                  }
                >
                  略過暖身
                </button>
              </div>
            </section>
          ) : review ? (
            <section className="card">
              <h2>訓練回顧</h2>
              <p>
                {current.exercises.length} 個動作 ·{" "}
                {
                  current.exercises
                    .flatMap((e) => e.sets)
                    .filter((s) => s.type === "working").length
                }{" "}
                工作組
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const feedback = String(
                    new FormData(e.currentTarget).get("feedback"),
                  );
                  if (
                    save("完成訓練與 Cycle Day", (s) => {
                      const session = s.sessions.find(
                        (x) => x.id === current.id,
                      )!;
                      if (session.status === "completed") return;
                      completeSession(s, session, stamp());
                      session.feedback = feedback;
                    })
                  ) {
                    setReview(false);
                    setCompletedId(current.id);
                    notify("訓練已保存");
                  }
                }}
              >
                <Field label="訓練感受（選填）">
                  <textarea name="feedback" maxLength={600} />
                </Field>
                <button className="button">
                  完成訓練
                  <Check size={16} />
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setReview(false)}
                >
                  繼續記錄
                </button>
              </form>
            </section>
          ) : (
            <>
              {ex ? (
                <section className="card exercise-focus">
                  <div className="exercise-nav">
                    <button
                      className="icon-button"
                      aria-label="上一個動作"
                      disabled={!exercise}
                      onClick={() => {
                        setType("working");
                        setExercise(exercise - 1);
                      }}
                    >
                      <ArrowLeft />
                    </button>
                    <span>
                      動作 {exercise + 1} / {current.exercises.length}
                    </span>
                    <button
                      className="icon-button"
                      aria-label="下一個動作"
                      disabled={exercise >= current.exercises.length - 1}
                      onClick={() => {
                        setType("working");
                        setExercise(exercise + 1);
                      }}
                    >
                      <ArrowRight />
                    </button>
                  </div>
                  <Dumbbell className="exercise-symbol" size={40} />
                  <h2>{ex.name}</h2>
                  {ex.plannedSets && (
                    <p className="muted">
                      計畫 {ex.plannedSets} 組 × {ex.reps} · 休息{" "}
                      {ex.restSeconds} 秒
                    </p>
                  )}
                  <p className="muted">
                    上次：
                    {state.preferences?.showPrevious === false
                      ? "已隱藏"
                      : previousSets
                          ?.map((p) => `${p.weight} kg × ${p.reps}`)
                          .join(" ／ ") || "尚未紀錄"}
                  </p>
                  <details>
                    <summary>動作設定</summary>
                    {(
                      [
                        ["allowRestPause", "Rest-Pause"],
                        ["allowDropSet", "Drop Set"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="check">
                        <input
                          type="checkbox"
                          checked={ex[key] ?? false}
                          onChange={(e) => {
                            setType("working");
                            save("更新本次動作選項", (s) => {
                              s.sessions
                                .find((x) => x.id === current.id)!
                                .exercises.find((x) => x.id === ex.id)![key] =
                                e.target.checked;
                            });
                          }}
                        />
                        {label}
                      </label>
                    ))}
                  </details>
                  <div className="set-history" aria-label="已記錄組次">
                    {ex.sets.filter(s=>!s.parentId || !ex.sets.some(p=>p.id===s.parentId)).map((set,i)=>(
                      <div className="set-group" key={set.id}>
                        <div className="session-set">
                          <span>{i+1} · {set.type.toUpperCase()}</span>
                          <strong>{set.weight} kg × {set.reps}</strong>
                          <div className="set-row-controls">
                            <button type="button" className="text-link" onClick={()=>setEditingSetId(set.id)}>編輯</button>
                            <button type="button" className="text-link" onClick={()=>deleteRecordedSet(set.id)}>刪除</button>
                          </div>
                        </div>
                        {ex.sets.filter(s=>s.parentId===set.id).map(child=>(
                          <div className="session-set session-set-child" key={child.id}>
                            <span>└ {child.type.toUpperCase()}</span>
                            <strong>{child.weight} kg × {child.reps}</strong>
                            <div className="set-row-controls">
                              <button type="button" className="text-link" onClick={()=>setEditingSetId(child.id)}>編輯</button>
                              <button type="button" className="text-link" onClick={()=>deleteRecordedSet(child.id)}>刪除</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  {undoDeletion?.sessionId===current.id &&
                   undoDeletion.exerciseId===ex.id && (
                    <div role="status" className="set-undo-banner">
                      已刪除組次
                      <button type="button" className="text-link" onClick={()=>{
                        if(save("復原刪除組次",draft=>{
                          const target=draft.sessions.find(s=>s.id===current.id)!.exercises.find(e=>e.id===ex.id)!;
                          const entries=undoDeletion.removed.map((s,i)=>({s,index:undoDeletion.indices[i]}))
                            .sort((a,b)=>a.index-b.index);
                          entries.forEach(({s,index})=>{
                            if(!target.sets.some(t=>t.id===s.id))
                              target.sets.splice(Math.min(index,target.sets.length),0,s);
                          });
                        }))setUndoDeletion(null);
                      }}>復原</button>
                    </div>
                  )}
                  <form
                    key={ex.id + "-" + entryVersion}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (submitLock.current || setRecorded) return;
                      submitLock.current = true;
                      window.setTimeout(()=>{submitLock.current=false;},650);
                      const d = new FormData(e.currentTarget);
                      if (
                        save("保存訓練段落", (s) => {
                          const target = s.sessions
                            .find((x) => x.id === current.id)!
                            .exercises.find((x) => x.id === ex.id)!;
                          const parent = String(d.get("parent") ?? "");
                          if (
                            ["rp", "drop"].includes(type) &&
                            !target.sets.some(
                              (s) => s.id === parent && s.type === "working",
                            )
                          )
                            throw Error("請選擇所屬工作組");
                          target.sets.push({
                            id: uid(),
                            type,
                            weight: Number(d.get("weight")),
                            reps: Number(d.get("reps")),
                            rir: null, // Preserve legacy schema, stop collecting RIR.
                            createdAt: stamp(),
                            ...(["rp", "drop"].includes(type)
                              ? { parentId: parent }
                              : {}),
                          });
                        })
                      ) {
                        setRecorded(true);
                        notify("這組已保存");
                        if (
                          type === "working" &&
                          state.preferences?.autoRest === true
                        )
                          startTimer();
                      }
                    }}
                  >
                    <Field label="組型">
                      <select
                        value={type}
                        onChange={(e) =>
                          setType(e.target.value as Segment["type"])
                        }
                      >
                        <option value="working">Working Set</option>
                        <option value="warmup">Warm-up</option>
                        <option value="rampup">Ramp-up</option>
                        {ex.allowRestPause &&
                          state.preferences?.allowRestPause !== false && (
                            <option value="rp">Rest-Pause</option>
                          )}
                        {ex.allowDropSet &&
                          state.preferences?.allowDropSet !== false && (
                            <option value="drop">Drop Set</option>
                          )}
                      </select>
                    </Field>
                    <div className="set-inputs">
                      <Num
                        label="重量 kg"
                        name="weight"
                        max={1000}
                        value={previous?.weight}
                      />
                      <Num
                        label="次數"
                        name="reps"
                        min={1}
                        max={500}
                        step="1"
                        value={previous?.reps}
                      />

                    </div>
                    {["rp", "drop"].includes(type) && (
                      <Field label="所屬工作組">
                        <select name="parent" required>
                          <option value="">請選擇</option>
                          {ex.sets
                            .filter((s) => s.type === "working")
                            .map((s, i) => (
                              <option value={s.id} key={s.id}>
                                工作組 {i + 1} · {s.weight} × {s.reps}
                              </option>
                            ))}
                        </select>
                      </Field>
                    )}
                    <button className="button" disabled={!!current.pausedAt || setRecorded}>
                      {setRecorded ? "已保存" : "完成這一組"}
                      <Check size={16} />
                    </button>
                  </form>
                  {setRecorded && <button type="button" className="button secondary"
                    onClick={()=>{setEntryVersion(v=>v+1);setRecorded(false);}}>
                    ＋ 記錄下一組
                  </button>}
                </section>
              ) : (
                <section className="card">
                  <h2>新增第一個動作</h2>
                  <button className="button" onClick={() => setAdd(true)}>
                    <Plus size={16} />
                    加入動作
                  </button>
                </section>
              )}
              <div className="two-actions">
                <button
                  className="button secondary"
                  onClick={() => setAdd(true)}
                >
                  <Plus size={16} />
                  加入動作
                </button>
                <button
                  className="button secondary"
                  onClick={() => setReview(true)}
                >
                  訓練回顧
                  <ArrowRight size={16} />
                </button>
              </div>
              <div className="rest-dock">
                <Timer size={19} />
                <span>休息</span>
                <strong>
                  {timerEnd
                    ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
                    : `${Math.floor(Number(state.preferences?.restSeconds ?? 120) / 60)}:${String(Number(state.preferences?.restSeconds ?? 120) % 60).padStart(2, "0")}`}
                </strong>
                <button
                  className="icon-button"
                  aria-label={timerEnd ? "停止計時" : "開始計時"}
                  onClick={() => {
                    if (timerEnd) {
                      setTimerEnd(null);
                      sessionStorage.removeItem("james-rest-end");
                    } else startTimer();
                  }}
                >
                  {timerEnd ? <Pause /> : <Play />}
                </button>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="training-home training-v3">
          <div className="training-v3-segments" role="navigation" aria-label="訓練頁面">
            <span className="active">Plan</span>
            <Link href="/training/history">History</Link>
          </div>
          <section className="training-today card">
            <span className="eyebrow">CURRENT PLAN</span>
            <div className="training-v3-heading">
              <div><h2>{current?.name ?? (day ? day.name : "尚未建立訓練計畫")}</h2>
                <span className="training-v3-caption">{day ? `${day.exercises?.length ?? 0} 個動作` : "先建立自己的訓練計畫"}</span>
              </div>
              <Link href="/training/plan" className="training-v3-edit" aria-label="編輯課表"><ChevronRight size={17}/></Link>
            </div>
            {day && (day.exercises?.length ?? 0)>0 && <div className="training-v3-exercises">
              {(day.exercises ?? []).map((item,index)=><Link href="/training/plan" className="training-v3-exercise" key={index}>
                <span className="training-v3-exercise-art" aria-hidden="true"><Dumbbell size={20} strokeWidth={1.3}/></span>
                <span className="training-v3-number">{index+1}</span>
                <span className="training-v3-exercise-info">
                  <strong>{item.name}</strong>
                  <small>{item.sets} × {item.reps}</small>
                </span>
                <ChevronRight size={14} aria-hidden="true"/>
              </Link>)}
            </div>}
            {current ? (
              <>
                <Link className="button" href="/training/session">繼續訓練 <ArrowRight size={16}/></Link>
                <details className="training-other-actions">
                  <summary>其他操作</summary>
                  <div className="stack">
                    <button className="text-link" onClick={() => {
                      if (save("將訓練移到今天", s => {
                        const x=s.sessions.find(x=>x.id===current.id)!;
                        x.workoutDate=date;x.scheduledDate=date;x.date=date;
                      }))notify("已移到今天");
                    }}>移到今天</button>
                    <button className="text-link" onClick={() => {
                      if (!confirm("放棄這次訓練？完成的組數會留在歷史，但不計入成果。"))return;
                      if(save("放棄 Session", s=>{
                        const x=s.sessions.find(x=>x.id===current.id)!;
                        x.status="discarded";x.discardedAt=stamp();
                      }))notify("訓練已放棄");
                    }}>放棄本次訓練</button>
                  </div>
                </details>
              </>
            ) : day ? (
              <>
                <button className="button" onClick={start}>開始訓練 <ArrowRight size={16}/></button>
                <details className="training-other-actions">
                  <summary>其他操作</summary>
                  <div className="stack">
                    <button className="text-link" onClick={()=>{
                      if(save("今天休息",s=>(s.schedule??=[]).push({
                        id:uid(),date,kind:"rest",createdAt:stamp(),
                      })))notify("今日已安排休息");
                    }}>今天休息</button>
                    <button className="text-link" onClick={()=>setSkip(true)}>略過本輪訓練日</button>
                  </div>
                </details>
              </>
            ) : (
              <Link className="button" href="/training/plan">建立訓練課表 <ArrowRight size={16}/></Link>
            )}
          </section>
          {(completedToday.length > 0 || !!plannedSecond) && (
            <section className="card stack training-daily-sessions" aria-label="今天完成的訓練">
              <div className="training-daily-sessions-heading">
                <h2>今日訓練 · {completedToday.length} 場已完成</h2>
                <small>共 {Math.round(completedToday.reduce((sum,s) => sum +
                  (s.activeDuration ?? Math.max(0,Date.parse(s.completedAt??s.createdAt)-Date.parse(s.createdAt))) / 60000,0))} 分鐘</small>
              </div>
              {completedToday.map((s,index)=> (
                <Link className="training-daily-session" href="/training/history" key={s.id}>
                  <span><strong>{String(index+1).padStart(2,"0")} · {s.name}</strong>
                    <small>{s.isExtra ? "額外訓練" : "課表訓練"} ·
                      {Math.round((s.activeDuration ??
                        Math.max(0,Date.parse(s.completedAt??s.createdAt)-Date.parse(s.createdAt))) / 60000)} 分鐘</small>
                  </span>
                  <ChevronRight size={16} aria-hidden="true" />
                </Link>
              ))}
              {!current && plannedSecond && <button type="button"
                className="button" onClick={startPlannedSecond}>
                開始自訂課表第二場 · {plannedSecond.name} <ArrowRight size={16}/>
              </button>}
            </section>
          )}
          {!current && (
            <button type="button" className="button secondary training-add-session"
              onClick={() => setExtraOpen(true)}>＋ 新增一場訓練</button>
          )}
          {cycle && <Link className="training-plan-summary" href="/training/plan">
            <span><small>目前課表</small><strong>{cycle.name}</strong><small>{cycle.days.length} 個訓練日 · 本輪尚有 {pendingIds(state,cycle).length} 天</small></span>
            <ChevronRight size={19}/>
          </Link>}
          <div className="training-home-links">
            <Link href="/training/calendar">訓練日曆 <ChevronRight size={17}/></Link>
            <Link href="/training/history">訓練歷史 <ChevronRight size={17}/></Link>
          </div>
          <details className="training-home-tools">
            <summary>其他訓練工具</summary>
            <div className="training-home-links">
              <Link href="/training/warmups">熱身管理 <ChevronRight size={17}/></Link>
              <Link href="/training/exercises">動作指南 <ChevronRight size={17}/></Link>
            </div>
          </details>
        </div>
      )}
      {extraOpen && !current && (
        <Sheet title="新增一場訓練" onClose={() => setExtraOpen(false)}>
          <p className="muted">僅新增這一次，不會變成常態課表，也不會推進 Cycle。</p>
          <form onSubmit={startExtra} className="stack">
            <Field label="訓練名稱">
              <input name="name" defaultValue="額外訓練" maxLength={80} required />
            </Field>
            <Field label="動作來源">
              <select name="templateDay" defaultValue="-1">
                <option value="-1">空白開始，自行加入動作</option>
                {cycle?.days.map((d,i)=>(
                  <option value={i} key={dayId(cycle,i)}>
                    套用 {d.name} 的動作（不計入 Cycle）
                  </option>
                ))}
              </select>
            </Field>
            <button type="submit" className="button">開始額外訓練 <ArrowRight size={16}/></button>
          </form>
        </Sheet>
      )}
      {skip && (
        <Sheet title="本輪不做這一天" onClose={() => setSkip(false)}>
          <p>
            略過 Day {dayIndex + 1} · {day?.name}
            ，將接續下一個訓練日。臨時休息可直接返回，順序不會改變。
          </p>
          <button
            className="button"
            onClick={() => {
              if (
                cycle &&
                window.confirm("確定本輪不做這一天？這會從待完成清單移除。") &&
                save("使用者確認本輪不做", (s) => {
                  const plan = s.cycles!.find((p) => p.id === cycle.id)!;
                  consumeDay(s, plan, dayId(plan, dayIndex));
                  (s.cycleEvents ??= []).push({
                    id: uid(),
                    cycleId: cycle.id,
                    type: "skipped_for_round",
                    trainingDayId: dayId(cycle, dayIndex),
                    date,
                  });
                })
              ) {
                setSkip(false);
                notify();
              }
            }}
          >
            確認略過
          </button>
        </Sheet>
      )}
      {editingSet && current && ex && (
        <Sheet title="編輯組次" onClose={()=>setEditingSetId(null)}>
          <form className="stack" onSubmit={e=>{
            e.preventDefault();
            const data=new FormData(e.currentTarget);
            const weight=Number(data.get("weight")), reps=Number(data.get("reps"));
            const kind=String(data.get("type")) as Segment["type"];
            if(!Number.isFinite(weight)||weight<0||weight>1000 ||
              !Number.isInteger(reps)||reps<1||reps>500)return;
            if(ex.sets.some(s=>s.parentId===editingSet.id)&&kind!=="working"){
              notify("工作組含延伸組，請先移除延伸組再變更組型");return;
            }
            if(save("編輯訓練組",draft=>{
              const target=draft.sessions.find(s=>s.id===current.id)!.exercises.find(x=>x.id===ex.id)!;
              const set=target.sets.find(s=>s.id===editingSet.id)!;
              set.weight=weight;set.reps=reps;set.type=kind;
            })){setEditingSetId(null);notify("已儲存修改");}
          }}>
            <Field label="組型">
              <select name="type" defaultValue={editingSet.type}>
                {editingSet.parentId ? <>
                  <option value="rp">Rest-Pause</option><option value="drop">Drop Set</option>
                </> : <>
                  <option value="working">Working Set</option>
                  {!ex.sets.some(s=>s.parentId===editingSet.id) && <>
                    <option value="warmup">Warm-up</option><option value="rampup">Ramp-up</option>
                  </>}
                </>}
              </select>
            </Field>
            <div className="set-inputs">
              <Num label="重量 kg" name="weight" max={1000} value={editingSet.weight}/>
              <Num label="次數" name="reps" min={1} max={500} step="1" value={editingSet.reps}/>
            </div>
            <button type="submit" className="button">儲存修改</button>
          </form>
        </Sheet>
      )}
      {add && (
        <Sheet title="新增動作" onClose={() => setAdd(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = String(
                new FormData(e.currentTarget).get("name"),
              ).trim();
              if (!current || !name) return;
              const index = current.exercises.length;
              const entry = catalog.find((x) => x.name === name);
              const fd = new FormData(e.currentTarget);
              if (
                save("新增訓練動作", (s) =>
                  s.sessions
                    .find((x) => x.id === current.id)!
                    .exercises.push({
                      id: uid(),
                      name,
                      sets: [],
                      muscle: entry?.muscle ?? String(fd.get("muscle")),
                      allowRestPause: fd.get("rp") === "on",
                      allowDropSet: fd.get("drop") === "on",
                    }),
                )
              ) {
                setExercise(index);
                setAdd(false);
                notify();
              }
            }}
          >
            <Field label="動作名稱">
              <input name="name" list="my-exercises" required maxLength={80} />
            </Field>
            <datalist id="my-exercises">
              {catalog.map((e) => (
                <option key={e.id} value={e.name} />
              ))}
              {Array.from(
                new Set(
                  state.sessions.flatMap((s) => s.exercises.map((e) => e.name)),
                ),
              ).map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <Field label="主要肌群">
              <select name="muscle">
                {[
                  "Chest",
                  "Back",
                  "Shoulders",
                  "Quads",
                  "Hamstrings",
                  "Glutes",
                  "Biceps",
                  "Triceps",
                  "Calves",
                  "Core",
                ].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
            <label className="check">
              <input type="checkbox" name="rp" />
              啟用 Rest-Pause
            </label>
            <label className="check">
              <input type="checkbox" name="drop" />
              啟用 Drop Set
            </label>
            <button className="button">加入動作</button>
          </form>
        </Sheet>
      )}
    </div>
  );
}

function ExerciseCatalog() {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("");
  const list = catalog.filter(
    (e) =>
      (!muscle || e.muscle === muscle) &&
      `${e.name} ${e.nameZh} ${e.brand}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <Field label="搜尋動作或器材">
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </Field>
      <Field label="肌群分類">
        <select value={muscle} onChange={(e) => setMuscle(e.target.value)}>
          <option value="">全部</option>
          {[...new Set(catalog.map((e) => e.muscle))].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </Field>
      <p className="muted">{list.length} 個動作</p>
      {list.map((e) => (
        <details className="history-list" key={e.id}>
          <summary>
            {e.nameZh} · {e.name}
          </summary>
          <p>
            {e.brand} · {e.muscle}
          </p>
          {e.sourceUrl && (
            <a
              className="text-link"
              href={e.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              器材來源
            </a>
          )}
          <p className="muted">示範影片待補充</p>
          <Link className="text-link" href={`/training/exercises/detail?id=${encodeURIComponent(e.id)}`}>查看動作詳情 →</Link>
        </details>
      ))}
    </>
  );
}
