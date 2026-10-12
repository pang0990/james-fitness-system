"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { activeCycle } from "@/lib/training-model";
import { dayId, pendingIds } from "@/lib/training-queue";
import { type Cycle } from "@/lib/domain";
import { PageTitle, Field, Num, uid, stamp } from "./daily";
import templates from "@/content/training-templates.json";
import catalog from "@/content/exercises.json";
export function TrainingPlan({ notify }: { notify: (s?: string) => void }) {
  const { state, save } = useStore();
  const current = activeCycle(state);
  const [name, setName] = useState(current?.name ?? "My Training Plan");
  const [days, setDays] = useState<Cycle["days"]>(
    () =>
      current?.days.map((d, i) => ({
        ...structuredClone(d),
        id: dayId(current, i),
      })) ?? [],
  );
  const [applyMode, setApplyMode] = useState("keep");
  const ongoing = state.sessions.find((s) => s.status === "in_progress");
  const [template, setTemplate] = useState("Upper / Lower");
  function preset(names: string[]) {
    setDays(
      templates[template as keyof typeof templates].map((day) => ({
        ...structuredClone(day),
        id: uid(),
      })),
    );
  }
  return (
    <div className="daily-page">
      <PageTitle title="Training Plan" />
      <p className="muted">
        自由建立訓練日。每次儲存建立新版本；已開始與完成的訓練保留原始紀錄。
      </p>
      <div className="two-actions">
        <select
          aria-label="選擇模板"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
        >
          <option>Upper / Lower</option>
          <option>PPL</option>
          <option>五分化</option>
        </select>
        <button
          className="button secondary"
          onClick={() => {
            if (
              days.length &&
              !confirm("以模板取代編輯中的訓練日？尚未儲存前不影響目前計畫。")
            )
              return;
            preset(
              template === "PPL"
                ? ["Push", "Pull", "Legs"]
                : template === "五分化"
                  ? ["Chest", "Back", "Legs", "Shoulders", "Arms"]
                  : ["Upper A", "Lower A", "Upper B", "Lower B"],
            );
          }}
        >
          使用 Default Template v1.0
        </button>
        <button
          className="button secondary"
          onClick={() =>
            setDays([...days, { id: uid(), name: "自訂訓練日", exercises: [] }])
          }
        >
          新增空白訓練日
        </button>
      </div>
      {template === "五分化" && (
        <p className="muted">Intermediate+ / Bodybuilding-oriented</p>
      )}
      <Field label="計畫名稱">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
        />
      </Field>
      {days.map((day, i) => (
        <section className="card stack" key={day.id}>
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
          <div className="two-actions">
            <button
              className="button secondary"
              disabled={!i}
              onClick={() => {
                const copy = [...days];
                [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
                setDays(copy);
              }}
            >
              上移
            </button>
            <button
              className="button danger"
              onClick={() => {
                if (confirm("從此計畫移除這個訓練日？歷史訓練保留。"))
                  setDays(days.filter((_, j) => j !== i));
              }}
            >
              刪除訓練日
            </button>
          </div>
          {(day.exercises ?? []).map((ex, j) => (
            <div className="plan-exercise" key={j}>
              <h3>{ex.name}</h3>
              <div className="form-grid">
                {(["sets", "reps", "rir", "restSeconds"] as const).map(
                  (key, k) => (
                    <Field
                      key={key}
                      label={["組數", "次數範圍", "RIR", "休息秒數"][k]}
                    >
                      <input
                        type={key === "reps" ? "text" : "number"}
                        min={key === "rir" ? 0 : 1}
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
              const item = catalog.find((x) => x.id === e.target.value)!;
              setDays(
                days.map((d, j) =>
                  j !== i
                    ? d
                    : {
                        ...d,
                        exercises: [
                          ...(d.exercises ?? []),
                          {
                            name: item.name,
                            muscle: item.muscle,
                            sets: 3,
                            reps: "8–12",
                            rir: 2,
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
            {catalog.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nameZh} · {e.name}
              </option>
            ))}
          </select>
        </section>
      ))}
      {ongoing && (
        <Field label="目前訓練如何處理">
          <select
            value={applyMode}
            onChange={(e) => setApplyMode(e.target.value)}
          >
            <option value="keep">
              保留今天的訓練，新版從下一個未開始日生效
            </option>
            <option value="reset">重置今天並套用新版</option>
          </select>
        </Field>
      )}
      <button
        className="button"
        disabled={
          !days.length || !name.trim() || days.some((d) => !d.name.trim())
        }
        onClick={() => {
          if (
            ongoing &&
            applyMode === "reset" &&
            (!confirm("重置今天並套用新版？原訓練保留為已放棄。") ||
              (ongoing.exercises.some((e) => e.sets.length) &&
                !confirm("已有組數，確定放棄本次紀錄並重新開始？")))
          )
            return;
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
                days: structuredClone(days),
                pending: pending.length ? pending : days.map((d) => d.id!),
                round: (old?.round ?? 1) + (pending.length ? 0 : 1),
                previousId: old?.id,
                stage: old?.stage ?? "Intensity",
                createdAt: stamp(),
              });
              if (ongoing && applyMode === "reset") {
                const session = s.sessions.find((x) => x.id === ongoing.id)!;
                session.status = "discarded";
                session.discardedAt = stamp();
                const plan = s.cycles.at(-1)!;
                const d =
                  plan.days.find((d) => d.id === session.trainingDayId) ??
                  plan.days.find((d) => plan.pending!.includes(d.id!)) ??
                  plan.days[0];
                s.sessions.push({
                  id: uid(),
                  date: session.workoutDate ?? session.date,
                  workoutDate: session.workoutDate ?? session.date,
                  scheduledDate: session.scheduledDate,
                  status: "in_progress",
                  name: d.name,
                  cycleId: plan.id,
                  trainingDayId: d.id,
                  round: plan.round,
                  phase: "warmup",
                  createdAt: stamp(),
                  warmupIds: [...(s.warmupPreset ?? [])],
                  exercises: (d.exercises ?? []).map((e) => ({
                    ...e,
                    id: uid(),
                    plannedSets: e.sets,
                    sets: [],
                  })),
                });
              }
            })
          )
            notify("新版本已儲存；從下一個尚未開始的訓練日套用");
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
