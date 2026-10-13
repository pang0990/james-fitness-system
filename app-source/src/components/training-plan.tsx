"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { activeCycle } from "@/lib/training-model";
import { dayId, pendingIds } from "@/lib/training-queue";
import { type Cycle } from "@/lib/domain";
import { PageTitle, Field, Num, uid, stamp } from "./daily";
import templates from "@/content/training-templates.json";
import catalog from "@/content/exercises.json";
export function TrainingPlan({ notify, startBlank = false }: { notify: (s?: string) => void; startBlank?: boolean }) {
  const { state, save } = useStore();
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
  function preset(selected:string) {
    if (days.length && !window.confirm("依選擇的分化帶入課表？未儲存的修改會被新的分化取代，已完成的訓練紀錄不受影響。")) return;
    setTemplate(selected);
    if (selected === "自訂空白") { setDays([]);return; }
    setDays(templates[selected as keyof typeof templates].map(day => ({
      ...structuredClone(day), id: uid(),
    })));
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
      <button type="button" className="button secondary" onClick={()=>setDays([...days,{id:uid(),name:"自訂訓練日",exercises:[]}])}>＋ 新增訓練日</button>
      {template==="五分化"&&<p className="muted">請依自己的訓練量與恢復狀態調整，所有動作皆可刪除或修改。</p>}
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

      <button
        className="button"
        disabled={
          !days.length || !name.trim() || days.some((d) => !d.name.trim())
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
