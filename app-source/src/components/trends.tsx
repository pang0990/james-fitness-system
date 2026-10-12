"use client";
import Link from "next/link";
import { recoveryEntries } from "@/lib/recovery";
import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  addDays,
  mealTotals,
  visibleMeals,
  visibleMeasurements,
  waterTotal,
  round,
  type AppState,
} from "@/lib/domain";
import { PageTitle, Menu, Sheet, Field } from "./daily";
export type Point = { date: string; value: number };
export function LineChart({
  points,
  unit,
  large = false,
}: {
  points: Point[];
  unit: string;
  large?: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  if (!points.length) return <div className="chart-empty">尚未紀錄</div>;
  const width = 500,
    height = large ? 230 : 110;
  const min = Math.min(...points.map((p) => p.value)),
    max = Math.max(...points.map((p) => p.value));
  const first = Date.parse(points[0].date),
    last = Date.parse(points.at(-1)!.date);
  const coords = points.map((p) => ({
    x: 30 + ((Date.parse(p.date) - first) / (last - first || 1)) * 440,
    y: height - 25 - ((p.value - min) / (max - min || 1)) * (height - 50),
  }));
  return (
    <div className="line-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${points.length} 筆紀錄趨勢，${min} 至 ${max} ${unit}`}
      >
        <line
          x1="30"
          x2="470"
          y1={height - 25}
          y2={height - 25}
          stroke="currentColor"
          opacity=".12"
        />
        {points.length > 1 && (
          <polyline
            points={coords.map((c) => `${c.x},${c.y}`).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          />
        )}
        {coords.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r={large ? 5 : 3} fill="currentColor" />
            {large && (
              <circle
                cx={c.x}
                cy={c.y}
                r="16"
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${points[i].date}：${points[i].value} ${unit}`}
                onClick={() => setSelected(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelected(i);
                }}
              />
            )}
          </g>
        ))}
      </svg>
      {large && (
        <>
          <div className="chart-axis">
            <span>{points[0].date}</span>
            <span>{points.at(-1)!.date}</span>
          </div>
          <p className="chart-readout" aria-live="polite">
            {selected !== null
              ? `${points[selected].date} · ${points[selected].value} ${unit}`
              : `${min} – ${max} ${unit}`}
          </p>
        </>
      )}
    </div>
  );
}
const defs = [
  ["weight", "體重", "kg", "body"],
  ["p", "蛋白質", "g", "nutrition"],
  ["c", "碳水化合物", "g", "nutrition"],
  ["f", "脂肪", "g", "nutrition"],
  ["kcal", "熱量", "kcal", "nutrition"],
  ["water", "飲水", "ml", "nutrition"],
  ["sets", "工作組", "組", "training"],
  ["load", "訓練總重量", "kg", "training"],
  ["sleep", "睡眠", "h", "recovery"],
  ["fatigue", "疲勞", "/5", "recovery"],
  ["soreness", "痠痛", "/5", "recovery"],
  ["stress", "壓力", "/5", "recovery"],
  ["minutes", "有氧時間", "min", "training"],
] as const;
export function metricPoints(state: AppState, key: string): Point[] {
  if (key === "weight")
    return visibleMeasurements(state).map((m) => ({
      date: m.date,
      value: m.weight,
    }));
  if (["p", "c", "f", "kcal"].includes(key))
    return Array.from(
      new Set([
        ...visibleMeals(state).map((m) => m.date),
        ...state.days.filter((d) => d.complete).map((d) => d.date),
      ]),
    )
      .sort()
      .map((date) => ({
        date,
        value: mealTotals(state, date)[key as "p" | "c" | "f" | "kcal"],
      }));
  if (key === "water")
    return Array.from(new Set(state.waters.map((w) => w.date)))
      .sort()
      .map((date) => ({ date, value: waterTotal(state, date) }));
  if (["sleep", "fatigue", "soreness", "stress"].includes(key)) {
    const mapped = new Map<string, any>();
    for (const r of recoveryEntries(state)) {
      if (r.type === "pain") continue;
      const row = mapped.get(r.date) ?? { date: r.date };
      row[r.type] = r.type === "sleep" ? r.value / 60 : r.value;
      mapped.set(r.date, row);
    }
    const byDate = mapped;
    return [...byDate.values()]
      .filter((r) => Number.isFinite(r[key]))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((r) => ({
        date: r.date,
        value: r[key as "sleep" | "fatigue" | "soreness" | "stress"],
      }));
  }
  if (key === "minutes") {
    const map = new Map<string, number>();
    state.cardio.forEach((c) =>
      map.set(c.date, (map.get(c.date) ?? 0) + c.minutes),
    );
    return [...map].sort().map(([date, value]) => ({ date, value }));
  }
  const map = new Map<string, number>();
  state.sessions
    .filter((s) => s.status === "completed")
    .forEach((s) => {
      const sets = s.exercises
        .flatMap((e) => e.sets)
        .filter((s) => !["warmup", "rampup"].includes(s.type));
      const v =
        key === "sets"
          ? sets.filter((s) => s.type === "working").length
          : sets.reduce((a, s) => a + s.weight * s.reps, 0);
      map.set(s.date, (map.get(s.date) ?? 0) + v);
    });
  return [...map]
    .sort()
    .map(([date, value]) => ({ date, value: round(value) }));
}
export function Trends({ date }: { date: string }) {
  const { state } = useStore();
  const [range, setRange] = useState("7");
  const [detail, setDetail] = useState<string | null>(null);
  const [exercise, setExercise] = useState("");
  const start =
    range === "all" ? "0000-01-01" : addDays(date, -Number(range) + 1);
  const filter = (p: Point[]) =>
    p.filter((p) => p.date >= start && p.date <= date);
  const selected = defs.find((d) => d[0] === detail);
  const exerciseNames = Array.from(
    new Set(
      state.sessions
        .filter((s) => s.status === "completed")
        .flatMap((s) => s.exercises.map((e) => e.name)),
    ),
  );
  const pending = state.recommendations.find((r) => r.status === "pending");
  return (
    <div className="daily-page">
      <PageTitle title="Progress">
        <Menu
          items={[
            ["/progress/body", "記錄體重"],
            ["/progress/recovery", "記錄恢復"],
            ["/progress/review", "週回顧"],
          ]}
        />
      </PageTitle>
      <div className="range-control" aria-label="趨勢期間">
        {[
          ["7", "7D"],
          ["30", "30D"],
          ["all", "ALL"],
        ].map(([v, l]) => (
          <button
            aria-pressed={range === v}
            key={v}
            onClick={() => setRange(v)}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="trend-grid">
        {defs.map(([key, title, unit]) => {
          const points = filter(metricPoints(state, key));
          return (
            <button
              className="trend-card"
              key={key}
              onClick={() => setDetail(key)}
            >
              <div>
                <span>{title}</span>
                <ChevronRight size={17} />
              </div>
              <strong>
                {points.at(-1)?.value ?? "—"}
                <small>{unit}</small>
              </strong>
              <LineChart points={points} unit={unit} />
            </button>
          );
        })}
      </div>
      <section className="card">
        <h2>動作表現</h2>
        <Field label="選擇動作">
          <select
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
          >
            <option value="">請選擇</option>
            {exerciseNames.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </Field>
        {exercise &&
          (["weight", "reps", "rir"] as const).map((k, i) => {
            const ps = state.sessions
              .filter((s) => s.status === "completed")
              .flatMap((s) =>
                s.exercises
                  .filter((e) => e.name === exercise)
                  .flatMap((e) =>
                    e.sets
                      .filter((t) => t.type === "working" && t[k] !== null)
                      .map((t) => ({ date: s.date, value: t[k] as number })),
                  ),
              )
              .sort((a, b) => a.date.localeCompare(b.date));
            return (
              <details key={k}>
                <summary>{["重量 kg", "次數", "RIR"][i]}</summary>
                <LineChart
                  points={filter(ps)}
                  unit={["kg", "次", "RIR"][i]}
                  large
                />
              </details>
            );
          })}
      </section>
      <Link
        className="simple-row"
        href={pending ? "/progress/review" : "/progress/review"}
      >
        <span>
          <strong>Weekly Review</strong>
          <small>{pending ? "有 1 項建議待決定" : "查看紀錄與評估"}</small>
        </span>
        <ChevronRight />
      </Link>
      <Link className="simple-row" href="/progress/history">
        Plan Changes
        <ChevronRight size={18} />
      </Link>
      {selected && (
        <Sheet title={selected[1]} onClose={() => setDetail(null)}>
          <LineChart
            points={filter(metricPoints(state, selected[0]))}
            unit={selected[2]}
            large
          />
          {["p", "c", "f", "kcal"].includes(selected[0]) && (
            <p className="muted">
              數值為已記錄攝取量；未標記完整的日子可能只含部分飲食。
            </p>
          )}
          <div className="chart-values">
            {filter(metricPoints(state, selected[0]))
              .slice()
              .reverse()
              .map((p, i) => (
                <div key={i}>
                  <time>{p.date}</time>
                  <strong>
                    {p.value} {selected[2]}
                  </strong>
                </div>
              ))}
          </div>
          <Link
            className="button secondary"
            href={
              selected[3] === "body"
                ? "/progress/body"
                : selected[3] === "recovery"
                  ? "/progress/recovery"
                  : selected[3] === "nutrition"
                    ? "/nutrition"
                    : "/training"
            }
          >
            <Plus size={16} />
            記錄{selected[1]}
          </Link>
        </Sheet>
      )}
    </div>
  );
}
export function MetricDetails({
  date,
  group,
}: {
  date: string;
  group: string;
}) {
  const { state } = useStore();
  const [range, setRange] = useState("30"),
    [selected, setSelected] = useState<string | null>(null);
  const start =
    range === "all" ? "0000-01-01" : addDays(date, 1 - Number(range));
  const entries = defs.filter((d) => d[3] === group);
  const chosen = entries.find((d) => d[0] === selected);
  const points = (key: string) =>
    metricPoints(state, key).filter((p) => p.date >= start && p.date <= date);
  return (
    <section className="daily-page" style={{ marginTop: 32 }}>
      <h2>Detailed trends</h2>
      <div className="range-control">
        {["7", "30", "all"].map((r) => (
          <button
            key={r}
            aria-pressed={range === r}
            onClick={() => setRange(r)}
          >
            {r === "all" ? "ALL" : r + "D"}
          </button>
        ))}
      </div>
      <div className="trend-grid">
        {entries.map(([key, title, unit]) => (
          <button
            className="trend-card"
            aria-label={title}
            key={key}
            onClick={() => setSelected(key)}
          >
            <span>{title}</span>
            <LineChart points={points(key)} unit={unit} />
          </button>
        ))}
      </div>
      {chosen && (
        <Sheet title={chosen[1]} onClose={() => setSelected(null)}>
          <LineChart points={points(chosen[0])} unit={chosen[2]} large />
          <div className="chart-values">
            {points(chosen[0]).map((p, i) => (
              <div key={i}>
                <time>{p.date}</time>
                <span>
                  {p.value} {chosen[2]}
                </span>
              </div>
            ))}
          </div>
        </Sheet>
      )}
    </section>
  );
}
