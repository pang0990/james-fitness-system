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
  const [month, setMonth] = useState(date.slice(0, 7)),
    [selected, setSelected] = useState<string | null>(null),
    [start, setStart] = useState(date),
    [end, setEnd] = useState(addDays(date, 6)),
    [week, setWeek] = useState<number[]>(state.weeklySchedule ?? [1, 2, 4, 5]);
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
            entry = scheduleEntry(state, d),
            done = state.sessions.some(
              (s) =>
                (s.workoutDate ?? s.date) === d && s.status === "completed",
            );
          return (
            <button
              key={d}
              className={`${entry.kind !== "train" ? "rest-day" : ""} ${d === date ? "is-today" : ""}`}
              onClick={() => setSelected(d)}
            >
              <strong>{i + 1}</strong>
              <small>
                {done
                  ? "✓"
                  : entry.kind !== "train"
                    ? "Rest"
                    : entry.extra
                      ? "Extra"
                      : entry.trainingDayId
                        ? (plan?.days.find(
                            (x, j) => dayId(plan, j) === entry.trainingDayId,
                          )?.name ?? "已移除")
                        : d === date
                          ? next
                          : "接續順序"}
              </small>
            </button>
          );
        })}
      </div>
      <p className="muted">
        未完成的訓練日仍排在下一次。單日調整可選擇是否同步 Nutrition Day Type；批次安排不會擅自改變營養日期。已保存的歷史日期保持原快照。
      </p>
      <details className="card">
        <summary>批次安排／每週重複</summary>
        <div className="two-actions">
          {[0, 1].map((n) => (
            <button
              className="button secondary"
              key={n}
              onClick={() => {
                const weekday =
                  (new Date(date + "T12:00:00Z").getUTCDay() - weekStart + 7) %
                  7;
                const d = addDays(date, -weekday + n * 7);
                setStart(d);
                setEnd(addDays(d, 6));
              }}
            >
              {n ? "下週" : "本週"}
            </button>
          ))}
        </div>
        <Field label="開始日期">
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </Field>
        <Field label="結束日期">
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </Field>
        {Array.from({ length: 7 }, (_, i) => (
          <label className="check" key={i}>
            <input
              type="checkbox"
              checked={week.includes(i)}
              onChange={(e) =>
                setWeek(
                  e.target.checked ? [...week, i] : week.filter((x) => x !== i),
                )
              }
            />
            星期{"日一二三四五六"[i]}訓練
          </label>
        ))}
        <button
          className="button"
          onClick={() => {
            if (
              !start ||
              !end ||
              start > end ||
              Date.parse(end) - Date.parse(start) > 366 * 86400000
            )
              return;
            save("批次安排日期", (s) => {
              for (let d = start; d <= end; d = addDays(d, 1))
                (s.schedule ??= []).push({
                  id: uid(),
                  date: d,
                  kind: week.includes(new Date(d + "T12:00:00Z").getUTCDay())
                    ? "train"
                    : "rest",
                  source: "batch",
                  createdAt: stamp(),
                });
            });
          }}
        >
          套用日期範圍
        </button>
        <button
          className="button secondary"
          onClick={() =>
            save("每週重複安排", (s) => {
              s.weeklySchedule = week;
            })
          }
        >
          每週重複
        </button>
      </details>
      {selected && (
        <Sheet title={selected} onClose={() => setSelected(null)}>
          <div className="action-list">
            <button onClick={() => put("train")}>照訓練順序</button>
            <button onClick={() => put("rest")}>今天休息</button>
            {plan?.days.map((d, i) => (
              <button
                key={dayId(plan, i)}
                onClick={() => put("train", dayId(plan, i))}
              >
                今天改練 {d.name}
              </button>
            ))}
            {plan && (
              <button
                onClick={() =>
                  put(
                    "train",
                    dayId(plan, Math.max(0, nextDayIndex(state, plan))),
                    true,
                  )
                }
              >
                額外加一個 Workout
              </button>
            )}
            <button onClick={() => put("train", undefined, false, true)}>
              清除這天的更改
            </button>
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
export function WarmupPicker({ sessionId }: { sessionId?: string }) {
  const { state, save } = useStore();
  const current = state.sessions.find((s) => s.id === sessionId);
  const selected = current?.warmupIds ?? state.warmupPreset ?? [];
  const [edit, setEdit] = useState(!selected.length);
  return (
    <div>
      <h2>Warm-up</h2>
      <p>
        {selected.length} selected · 約{" "}
        {warmups
          .filter((w) => selected.includes(w.id))
          .reduce((a, w) => a + w.minutes, 0)}{" "}
        min
      </p>
      <button className="text-link" onClick={() => setEdit(!edit)}>
        {edit ? "收合" : "自訂"}
      </button>
      {edit && (
        <div>
          {warmups.map((w) => (
            <label className="check" key={w.id}>
              <input
                type="checkbox"
                checked={selected.includes(w.id)}
                onChange={(e) =>
                  save("選擇暖身", (s) => {
                    const next = e.target.checked
                      ? [...selected, w.id]
                      : selected.filter((x) => x !== w.id);
                    const sess = s.sessions.find((x) => x.id === sessionId);
                    if (sess) sess.warmupIds = next;
                    else s.warmupPreset = next;
                  })
                }
              />
              {w.name} · {w.minutes} min
            </label>
          ))}
          <button
            className="button secondary"
            onClick={() => {
              save("Save Warm-up Preset", (s) => {
                s.warmupPreset = [...selected];
              });
              setEdit(false);
            }}
          >
            Save Preset
          </button>
        </div>
      )}
      {!edit &&
        warmups
          .filter((w) => selected.includes(w.id))
          .map((w) => <p key={w.id}>{w.name}</p>)}
    </div>
  );
}
