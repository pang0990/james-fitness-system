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
  scheduleKind,
  scheduleEntry,
} from "@/lib/training-model";
import { Companion } from "./companion";
import catalog from "@/content/exercises.json";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { PageTitle, Menu, Sheet, Field, Num, uid, stamp } from "./daily";
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
  const [review, setReview] = useState(false);
  const [completedId, setCompletedId] = useState<string | null>(null);
  const [type, setType] = useState<Segment["type"]>("working");
  const [skip, setSkip] = useState(false);
  const [timerEnd, setTimerEnd] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const cycle = activeCycle(state);
  const count = cycle
    ? (state.cycleEvents?.filter((e) => e.cycleId === cycle.id).length ?? 0)
    : 0;
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
  useEffect(() => {
    if (current)
      sessionStorage.setItem("james-exercise-" + current.id, String(exercise));
  }, [exercise, current?.id]);
  useEffect(() => {
    if (current && exercise >= current.exercises.length) setExercise(0);
  }, [current?.id, current?.exercises.length, exercise]);
  const ex = current?.exercises[exercise];
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
  function start() {
    if (!cycle || !day) return;
    if (
      save("開始 Cycle 訓練", (s) => {
        if (s.sessions.some((x) => x.status === "in_progress")) return;
        s.sessions.push({
          id: uid(),
          date,
          name: `Day ${dayIndex + 1} · ${day.name}`,
          status: "in_progress",
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
              {current.pausedAt ? "Resume Workout" : "Pause Workout"}
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
                      計畫 {ex.plannedSets} 組 × {ex.reps} · RIR {ex.rir} · 休息{" "}
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
                  <div className="set-history">
                    {ex.sets.map((set, i) => (
                      <div className="session-set" key={set.id}>
                        <span>
                          {i + 1} · {set.type.toUpperCase()}
                        </span>
                        <strong>
                          {set.weight} kg × {set.reps}
                          {set.type === "working" &&
                            ex.sets
                              .filter((t) => t.parentId === set.id)
                              .map(
                                (t) =>
                                  ` + ${t.type === "drop" ? t.weight + " kg × " : ""}${t.reps} ${t.type.toUpperCase()}`,
                              )
                              .join("")}
                        </strong>
                        <small>RIR {set.rir ?? "—"}</small>
                      </div>
                    ))}
                  </div>
                  <form
                    key={ex.id}
                    onSubmit={(e) => {
                      e.preventDefault();
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
                            rir:
                              d.get("rir") === "" || d.get("rir") === null
                                ? null
                                : Number(d.get("rir")),
                            createdAt: stamp(),
                            ...(["rp", "drop"].includes(type)
                              ? { parentId: parent }
                              : {}),
                          });
                        })
                      ) {
                        notify("這組已保存");
                        if (
                          type === "working" &&
                          state.preferences?.autoRest !== false
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
                      {state.preferences?.showRIR !== false && (
                        <Num label="RIR" name="rir" max={10} required={false} />
                      )}
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
                    <button className="button" disabled={!!current.pausedAt}>
                      保存這一組
                      <Check size={16} />
                    </button>
                  </form>
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
        <div className="training-home">
          <section className="training-today card">
            <span className="eyebrow">TODAY'S WORKOUT</span>
            <h2>{current?.name ?? (day ? day.name : "尚未建立訓練計畫")}</h2>
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
