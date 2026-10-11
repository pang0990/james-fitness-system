"use client";
import Link from "next/link";
import { navigateWithMotion } from "./navigation-motion";
import { TrainingCalendar, WarmupPicker } from "./training-planning";
import { activeCycle, scheduleKind } from "@/lib/training-model";
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
import { type Segment } from "@/lib/domain";
import { trainingTemplates } from "@/lib/training-templates";
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
  const [setup, setSetup] = useState(
    path === "training/templates" || path === "training/cycle",
  );
  const [template, setTemplate] = useState(
    activeCycle(state)?.name ?? "Upper / Lower",
  );
  const [dayText, setDayText] = useState(
    activeCycle(state)
      ?.days.map((d) => d.name)
      .join("\n") ?? "Upper A\nLower A\nUpper B\nLower B",
  );
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
  const cycle = activeCycle(state);
  const count = cycle
    ? (state.cycleEvents?.filter((e) => e.cycleId === cycle.id).length ?? 0)
    : 0;
  const dayIndex = cycle ? count % cycle.days.length : 0;
  const day = cycle?.days[dayIndex];
  const current = state.sessions.find((s) => s.status === "in_progress");
  useEffect(() => {
    if (current)
      sessionStorage.setItem("james-exercise-" + current.id, String(exercise));
  }, [exercise, current?.id]);
  const ex = current?.exercises[exercise];
  const previous = state.sessions
    .filter((s) => s.status === "completed")
    .slice()
    .reverse()
    .flatMap((s) => s.exercises)
    .find((e) => e.name === ex?.name)
    ?.sets.filter((s) => s.type === "working")
    .at(-1);
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
  function startTimer() {
    const end = Date.now() + 90000;
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
          phase: "warmup",
          cycleId: cycle.id,
          cycleDayIndex: dayIndex,
          exercises: day.exercises?.length
            ? day.exercises.map((planned) => {
                const entry = catalog.find(
                  (item) =>
                    item.id === planned.exerciseId || item.name === planned.name,
                );
                return {
                  id: uid(),
                  name: planned.name,
                  muscle: entry?.muscle,
                  sets: [],
                  allowRestPause:
                    planned.allowRestPause ?? entry?.allowRestPause ?? false,
                  allowDropSet:
                    planned.allowDropSet ?? entry?.allowDropSet ?? false,
                  plannedSets: planned.sets,
                  repMin: planned.reps[0],
                  repMax: planned.reps[1],
                  targetRir: planned.rir,
                  restSeconds: planned.restSeconds,
                };
              })
            : catalog
                .filter((e) => {
                  const n = day.name.toLowerCase();
                  return n.includes("upper")
                    ? ["Chest", "Back", "Shoulders", "Biceps", "Triceps"].includes(
                        e.muscle,
                      )
                    : n.includes("lower") || n === "legs"
                      ? ["Quads", "Hamstrings", "Glutes", "Calves"].includes(
                          e.muscle,
                        )
                      : n === "push"
                        ? ["Chest", "Shoulders", "Triceps"].includes(e.muscle)
                        : n === "pull"
                          ? ["Back", "Biceps"].includes(e.muscle)
                          : n === "arms"
                            ? ["Biceps", "Triceps"].includes(e.muscle)
                            : e.muscle.toLowerCase() === n;
                })
                .filter(
                  (e, i, all) =>
                    all.findIndex((x) => x.muscle === e.muscle) === i,
                )
                .map((e) => ({
                  id: uid(),
                  name: e.name,
                  muscle: e.muscle,
                  sets: [],
                  allowRestPause: e.allowRestPause,
                  allowDropSet: e.allowDropSet,
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
  if (completedId) {
    const finished = state.sessions.find((s) => s.id === completedId)!;
    const sets = finished.exercises
      .flatMap((e) => e.sets)
      .filter((t) => t.type === "working").length;
    const minutes = Math.max(
      0,
      Math.round(
        (Date.parse(finished.completedAt!) - Date.parse(finished.createdAt)) /
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
        ) : (
          <Menu
            items={[
              ["/training/cycle", "Cycle 設定"],
              ["/training/templates", "選擇分化"],
              ["/training/exercises", "動作紀錄"],
              ["/training/activity", "Cardio"],
            ]}
          />
        )}
      </PageTitle>
      {workout ? (
        <>
          <div className="workout-heading">
            <span>{current.name}</span>
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
                      session.status = "completed";
                      session.completedAt = stamp();
                      session.feedback = feedback;
                      if (session.cycleId)
                        (s.cycleEvents ??= []).push({
                          id: uid(),
                          cycleId: session.cycleId,
                          type: "completed",
                          date,
                          sessionId: session.id,
                        });
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
                  <p className="muted">
                    上次：
                    {previous
                      ? `${previous.weight} kg × ${previous.reps}`
                      : "尚未紀錄"}
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
                              d.get("rir") === "" ? null : Number(d.get("rir")),
                            createdAt: stamp(),
                            ...(["rp", "drop"].includes(type)
                              ? { parentId: parent }
                              : {}),
                          });
                        })
                      ) {
                        notify("這組已保存");
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
                        {ex.allowRestPause && (
                          <option value="rp">Rest-Pause</option>
                        )}
                        {ex.allowDropSet && (
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
                      <Num label="RIR" name="rir" max={10} required={false} />
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
                    <button className="button">
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
                    : "1:30"}
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
        <>
          <section className="card cycle-overview">
            <span className="eyebrow">TRAINING PLAN</span>
            <h2>{cycle?.name ?? "尚未設定"}</h2>
            {cycle ? (
              <>
                <div className="cycle-track">
                  {cycle.days.map((d, i) => (
                    <div className={i === dayIndex ? "current" : ""} key={i}>
                      <span>{i + 1}</span>
                      <small>{d.name}</small>
                    </div>
                  ))}
                </div>
                <p className="muted">
                  Round {Math.floor(count / cycle.days.length) + 1} · 已完成{" "}
                  {dayIndex} / {cycle.days.length} 個訓練日
                </p>
              </>
            ) : (
              <button className="button" onClick={() => setSetup(true)}>
                建立 Training Plan
                <ArrowRight size={16} />
              </button>
            )}
          </section>
          <section className="card">
            <span className="eyebrow">TODAY</span>
            <h2>
              {current?.name ??
                (day ? `Day ${dayIndex + 1} · ${day.name}` : "尚未安排訓練")}
            </h2>
            {current ? (
              <Link className="button" href="/training/session">
                繼續訓練
                <ArrowRight size={16} />
              </Link>
            ) : day ? (
              <>
                {scheduleKind(state, date) !== "train" && (
                  <p className="muted">
                    今天已安排休息；仍可自行決定開始下一個訓練日。
                  </p>
                )}
                <button className="button" onClick={start}>
                  開始訓練
                  <ArrowRight size={16} />
                </button>
                <button className="text-link" onClick={() => setSkip(true)}>
                  略過這個訓練日
                </button>
              </>
            ) : null}
          </section>
          <TrainingCalendar date={date} />
          <details className="history-list">
            <summary>訓練紀錄</summary>
            {state.sessions
              .filter((s) => s.status === "completed")
              .slice()
              .reverse()
              .map((s) => (
                <details key={s.id}>
                  <summary>
                    {s.date} · {s.name}
                  </summary>
                  {s.exercises.map((e) => (
                    <div key={e.id}>
                      <h3>{e.name}</h3>
                      {e.sets.map((set) => (
                        <p key={set.id}>
                          {set.type.toUpperCase()} · {set.weight} kg ×{" "}
                          {set.reps} · RIR {set.rir ?? "—"}
                        </p>
                      ))}
                    </div>
                  ))}
                  {s.feedback && <p>{s.feedback}</p>}
                </details>
              ))}
            {!state.sessions.some((s) => s.status === "completed") && (
              <p>尚未紀錄</p>
            )}
          </details>
          <Link className="simple-row" href="/training/activity">
            Cardio
            <ChevronRight size={18} />
          </Link>
        </>
      )}
      {setup && (
        <Sheet title="設定 Cycle" onClose={() => setSetup(false)}>
          {current ? (
            <>
              <p>目前使用 {cycle?.name}。現行 Cycle 保留原設定。</p>
              <p className="muted">
                請先完成進行中的訓練，再確認新的 Cycle 版本。
              </p>
              {dayIndex === 0 && !current && (
                <button
                  className="button secondary"
                  onClick={() => setSetup(false)}
                >
                  保留目前設定
                </button>
              )}
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const names = dayText
                  .split("\n")
                  .map((name) => name.trim())
                  .filter(Boolean);
                if (!names.length) return;
                const preset = trainingTemplates.find((item) => item.name === template);
                if (
                  save("確認建立 Training Plan", (s) => {
                    (s.cycles ??= []).push({
                      id: uid(),
                      name: template === "Build from Scratch" ? "Personal Plan" : template,
                      previousId: cycle?.id,
                      stage: "Intensity",
                      days: names.map((name, i) => ({
                        name,
                        templateId: preset?.days[i]?.id,
                        exercises: preset?.days[i]?.exercises.map((exercise) => ({
                          exerciseId: exercise.exerciseId,
                          name: exercise.name,
                          sets: exercise.sets,
                          reps: exercise.reps,
                          rir: exercise.rir,
                          restSeconds: exercise.restSeconds,
                          allowRestPause: exercise.allowRestPause,
                          allowDropSet: exercise.allowDropSet,
                        })),
                      })),
                      createdAt: stamp(),
                    });
                  })
                ) {
                  setSetup(false);
                  notify("Training Plan 已建立");
                }
              }}
            >
              <Field label="建立方式">
                <select
                  value={template}
                  onChange={(e) => {
                    const name = e.target.value;
                    setTemplate(name);
                    const preset = trainingTemplates.find((item) => item.name === name);
                    setDayText(
                      preset?.days.length
                        ? preset.days.map((day) => day.name).join("\n")
                        : "",
                    );
                  }}
                >
                  {trainingTemplates.map((item) => (
                    <option key={item.id}>{item.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Training Day 順序（每行一個）">
                <textarea
                  value={dayText}
                  onChange={(e) => setDayText(e.target.value)}
                  required
                  maxLength={500}
                  placeholder={"Upper A\nLower A\n我的胸背日"}
                />
              </Field>
              <p className="muted">
                Template 只負責預先帶入課表。你可以改名、混搭或從空白建立；休息日直接在 Calendar 設定，不綁固定幾練幾休。
              </p>
              <p className="muted">
                Upper / Lower、PPL、五分化會帶入 James 預設動作、組數、次數範圍、RIR 與休息時間；歷史 Training Plan 不會被覆寫。
              </p>
              <button className="button">建立 Training Plan</button>
            </form>
          )}
        </Sheet>
      )}
      {skip && (
        <Sheet title="確認略過訓練日" onClose={() => setSkip(false)}>
          <p>
            略過 Day {dayIndex + 1} · {day?.name}
            ，將接續下一個訓練日。臨時休息可直接返回，順序不會改變。
          </p>
          <button
            className="button"
            onClick={() => {
              if (
                cycle &&
                save("使用者確認略過 Cycle Day", (s) =>
                  (s.cycleEvents ??= []).push({
                    id: uid(),
                    cycleId: cycle.id,
                    type: "skipped",
                    date,
                  }),
                )
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
        </details>
      ))}
    </>
  );
}