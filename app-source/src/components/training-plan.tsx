"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { activeCycle } from "@/lib/training-model";
import { dayId, pendingIds } from "@/lib/training-queue";
import { type Cycle } from "@/lib/domain";
import { PageTitle, Field, Num, uid, stamp } from "./daily";
import templates from "@/content/training-templates.json";
import {exerciseLibrary} from "@/lib/exercise-library";
export function TrainingPlan({ notify, startBlank = false }: { notify: (s?: string) => void; startBlank?: boolean }) {
  const { state, save } = useStore();
  const library=exerciseLibrary(state);
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
  const ongoing = state.sessions.find((s) => s.status === "in_progress");
  const [template, setTemplate] = useState("");
  const [planSource, setPlanSource] = useState<"custom" | "template">(
    startBlank || current?.source === "custom" ? "custom" : "template",
  );
  // Stable ID keeps the user's day in focus through edits and reordering.
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const activeIndex = days.findIndex((day) => day.id === activeDayId);
  const selectedIndex = activeIndex < 0 ? 0 : activeIndex;
  const selectDay = (index: number) => {
    if (index >= 0 && index < days.length) setActiveDayId(days[index].id ?? null);
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
    <div className="daily-page">
      <PageTitle title="Training Plan" />

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
            setActiveDayId(id);
          }}>＋ 新增訓練日</button>
      </section>
      {days.map((day, i) => ({day, i})).filter(({i}) => i === selectedIndex).map(({day, i}) => (
        <section className="card stack plan-day-editor" key={day.id}>
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
                  {(day.secondSession.exercises ?? []).map((ex,j) => (
                    <div className="plan-exercise" key={j}>
                      <strong>{ex.name}</strong>
                      <div className="form-grid">
                        {(["sets","reps","restSeconds"] as const).map((key,k) => (
                          <Field key={key} label={["組數","次數範圍","休息秒數"][k]}>
                            <input type={key==="reps" ? "text" : "number"}
                              min={1}
                              max={key==="restSeconds" ? 3600 : 100}
                              value={ex[key]}
                              onChange={e => setDays(days.map((d,n) => n !== i ? d : ({
                                ...d, secondSession:{
                                  ...d.secondSession!,
                                  exercises:d.secondSession!.exercises!.map((x,m) => m!==j ? x : ({
                                    ...x,[key]:key==="reps" ? e.target.value : Number(e.target.value),
                                  })),
                                },
                              })))} />
                          </Field>
                        ))}
                      </div>
                      <button type="button" className="text-link"
                        onClick={() => setDays(days.map((d,n) => n!==i ? d : ({
                          ...d,secondSession:{...d.secondSession!,
                            exercises:d.secondSession!.exercises!.filter((_,m)=>m!==j)},
                        })))}>移除動作</button>
                    </div>
                  ))}
                  <select aria-label="第二場加入動作" value=""
                    onChange={e => {
                      const item=library.find(x=>x.id===e.target.value);
                      if(!item)return;
                      setDays(days.map((d,j)=>j!==i ? d : ({
                        ...d,
                        secondSession:{
                          ...d.secondSession!,
                          exercises:[...(d.secondSession!.exercises??[]),{
                            exerciseLibraryId:item.id,name:item.name,muscle:item.muscle,sets:3,reps:"8–12",
                            restSeconds:120,allowRestPause:item.allowRestPause,
                            allowDropSet:item.allowDropSet,
                          }],
                        },
                      })));
                    }}>
                    <option value="">＋ 第二場加入動作</option>
                    {library.map(ex=><option key={ex.id} value={ex.id}>{ex.nameZh} · {ex.name}</option>)}
                  </select>
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
          {(day.exercises ?? []).map((ex, j) => (
            <div className="plan-exercise" key={j}>
              <h3>{ex.name}</h3>
              <div className="form-grid">
                {(["sets", "reps", "restSeconds"] as const).map(
                  (key, k) => (
                    <Field
                      key={key}
                      label={["組數", "次數範圍", "休息秒數"][k]}
                    >
                      <input
                        type={key === "reps" ? "text" : "number"}
                        min={1}
                        max={key === "restSeconds" ? 3600 : 100}
                        value={ex[key]}
                        onChange={(e) =>
                          setDays(
                            days.map((d, n) =>
                              n !== i
                                ? d
                                : {
                                    ...d,
                                    exercises: d.exercises!.map((x, m) =>
                                      m !== j
                                        ? x
                                        : {
                                            ...x,
                                            [key]:
                                              key === "reps"
                                                ? e.target.value
                                                : Number(e.target.value),
                                          },
                                    ),
                                  },
                            ),
                          )
                        }
                      />
                    </Field>
                  ),
                )}
              </div>
              <button
                className="text-link"
                onClick={() =>
                  setDays(
                    days.map((d, n) =>
                      n !== i
                        ? d
                        : {
                            ...d,
                            exercises: d.exercises!.filter((_, m) => m !== j),
                          },
                    ),
                  )
                }
              >
                移除動作
              </button>
            </div>
          ))}
          <select
            aria-label={`加入動作 ${i + 1}`}
            value=""
            onChange={(e) => {
              const item = library.find((x) => x.id === e.target.value)!;
              setDays(
                days.map((d, j) =>
                  j !== i
                    ? d
                    : {
                        ...d,
                        exercises: [
                          ...(d.exercises ?? []),
                          {
                            exerciseLibraryId: item.id,
                            name: item.name,
                            muscle: item.muscle,
                            sets: 3,
                            reps: "8–12",
                            restSeconds: 120,
                            allowRestPause: item.allowRestPause,
                            allowDropSet: item.allowDropSet,
                          },
                        ],
                      },
                ),
              );
            }}
          >
            <option value="">＋加入動作</option>
            {library.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nameZh} · {e.name}
              </option>
            ))}
          </select>
        </section>
      ))}

      <button
        className="button"
        disabled={
          !days.length || !name.trim() || days.some((d) =>
            !d.name.trim() || (d.secondSession &&
              (!d.secondSession.name.trim() || !d.secondSession.exercises?.length)))
        }
        onClick={() => {
          if (
            save("儲存 Training Plan 新版本", (s) => {
              const old = activeCycle(s);
              const oldPending = old ? pendingIds(s, old) : [];
              const oldIds = old?.days.map((_, i) => dayId(old, i)) ?? [];
              const pending = days
                .filter(
                  (d) => !oldIds.includes(d.id!) || oldPending.includes(d.id!),
                )
                .map((d) => d.id!);
              (s.cycles ??= []).push({
                id: uid(),
                name: name.trim(),
                source: planSource,
                days: structuredClone(days),
                pending: pending.length ? pending : days.map((d) => d.id!),
                round: (old?.round ?? 1) + (pending.length ? 0 : 1),
                previousId: old?.id,
                stage: old?.stage ?? "Intensity",
                createdAt: stamp(),
              });
            })
          )
            { notify("課表已儲存"); router.push("/training"); }
        }}
      >
        儲存計畫版本
      </button>
      {current && (
        <p className="muted">
          目前版本 {current.createdAt.slice(0, 16).replace("T", " ")} ·{" "}
          {current.days.length} 個訓練日
        </p>
      )}
    </div>
  );
}
