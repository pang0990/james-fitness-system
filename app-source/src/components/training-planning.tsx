"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { addDays, type Cycle } from "@/lib/domain";
import {
  activeCycle,
  muscles,
  stages,
  muscleCompleted,
  scheduleKind,
  warmups,
  type MuscleTarget,
} from "@/lib/training-model";
import { Field, Sheet, uid, stamp } from "./daily";
export function TrainingCalendar({ date }: { date: string }) {
  const { state, save } = useStore();
  const [month, setMonth] = useState(date.slice(0, 7)),
    [selected, setSelected] = useState<string | null>(null),
    [move, setMove] = useState("");
  const first = month + "-01",
    length = new Date(
      Number(month.slice(0, 4)),
      Number(month.slice(5)),
      0,
    ).getDate(),
    offset = new Date(first + "T12:00:00").getDay();
  const cycle = activeCycle(state);
  const latestEvent =
    state.cycleEvents?.filter((e) => e.cycleId === cycle?.id).length ?? 0;
  function change(n: number) {
    const d = new Date(first + "T12:00:00");
    d.setMonth(d.getMonth() + n);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  function put(kind: "train" | "rest" | "temporary_rest") {
    save("更新訓練日曆", (s) =>
      (s.schedule ??= []).push({
        id: uid(),
        date: selected!,
        kind,
        createdAt: stamp(),
      }),
    );
    setSelected(null);
  }
  return (
    <section className="calendar-section">
      <div className="card-head">
        <h2>{month.replace("-", " / ")}</h2>
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
        {"日一二三四五六".split("").map((d) => (
          <small key={d}>{d}</small>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={"blank" + i} />
        ))}
        {Array.from({ length }, (_, i) => {
          const day = addDays(first, i),
            kind = scheduleKind(state, day),
            done = state.sessions.find(
              (s) => s.date === day && s.status === "completed",
            );
          let advance = 0;
          for (let d = date; d < day; d = addDays(d, 1)) {
            if (
              scheduleKind(state, d) === "train" &&
              !state.sessions.some(
                (s) => s.date === d && s.status === "completed",
              )
            )
              advance++;
          }
          const projected =
            cycle?.days[(latestEvent + advance) % cycle.days.length]?.name;
          return (
            <button
              key={day}
              className={`${kind !== "train" ? "rest-day" : ""} ${day === date ? "is-today" : ""}`}
              onClick={() => {
                setSelected(day);
                setMove("");
              }}
            >
              <strong>{i + 1}</strong>
              <small>
                {done
                  ? "✓"
                  : kind === "rest"
                    ? "Rest"
                    : kind === "temporary_rest"
                      ? "Temp"
                      : day >= date && cycle
                        ? projected
                        : "—"}
              </small>
            </button>
          );
        })}
      </div>
      <p className="muted">
        點日期安排休息或移動休息日。休息不跳過 Cycle Day；營養日型另行設定。
      </p>
      {selected && (
        <Sheet title={selected} onClose={() => setSelected(null)}>
          <div className="action-list">
            <button onClick={() => put("train")}>
              Training Day · 接續下一個 Cycle Day
            </button>
            <button onClick={() => put("rest")}>Rest Day</button>
            <button onClick={() => put("temporary_rest")}>
              Temporary Rest · 順延訓練
            </button>
          </div>
          <Field label="移動此日安排至">
            <input
              type="date"
              value={move}
              onChange={(e) => setMove(e.target.value)}
            />
          </Field>
          <button
            disabled={!move || move === selected}
            className="button secondary"
            onClick={() => {
              save("交換訓練日安排", (s) => {
                const a = scheduleKind(s, selected),
                  b = scheduleKind(s, move);
                (s.schedule ??= []).push(
                  { id: uid(), date: selected, kind: b, createdAt: stamp() },
                  { id: uid(), date: move, kind: a, createdAt: stamp() },
                );
              });
              setSelected(null);
            }}
          >
            交換日期
          </button>
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
