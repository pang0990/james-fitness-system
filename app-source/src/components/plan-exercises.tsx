"use client";
import { useState } from "react";
import type { CycleExercise } from "@/lib/domain";
import type { exerciseLibrary } from "@/lib/exercise-library";
import { reordered } from "@/lib/plan-version-review";
import { Field } from "./daily";

type Items = ReturnType<typeof exerciseLibrary>;
export function PlanExercises({
  rows,
  items,
  change,
  label,
}: {
  rows: CycleExercise[];
  items: Items;
  change: (rows: CycleExercise[]) => void;
  label: string;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [replacement, setReplacement] = useState<number | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [pending, setPending] = useState<CycleExercise | null>(null);
  function select(id: string) {
    setSelected(id);
    const item = items.find((x) => x.id === id);
    if (!item) {
      setPending(null);
      return;
    }
    const prior = replacement === null ? undefined : rows[replacement];
    setPending({
      sets: prior?.sets ?? 3,
      reps: prior?.reps ?? "8–12",
      restSeconds: prior?.restSeconds ?? 120,
      targetRir: prior?.targetRir,
      exerciseLibraryId: id,
      name: item.name,
      muscle: item.muscle,
      allowDropSet: item.allowDropSet,
      allowRestPause: item.allowRestPause,
    });
  }
  function reset() {
    setReplacement(null);
    setQuery("");
    setSelected("");
    setPending(null);
  }
  function targets(
    row: CycleExercise,
    update: (patch: Partial<CycleExercise>) => void,
  ) {
    return (
      <div className="form-grid">
        <Field label="計畫組數">
          <input
            required
            type="number"
            min="1"
            max="100"
            value={row.sets}
            onChange={(e) => update({ sets: Number(e.target.value) })}
          />
        </Field>
        <Field label="次數範圍">
          <input
            required
            value={row.reps}
            onChange={(e) => update({ reps: e.target.value })}
          />
        </Field>
        <Field label="目標 RIR">
          <input
            type="number"
            min="0"
            max="10"
            value={row.targetRir ?? ""}
            onChange={(e) =>
              update({
                targetRir:
                  e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
          />
        </Field>
        <Field label="休息秒數">
          <input
            required
            type="number"
            min="1"
            max="3600"
            value={row.restSeconds}
            onChange={(e) => update({ restSeconds: Number(e.target.value) })}
          />
        </Field>
        <label>
          <input
            type="checkbox"
            checked={row.allowDropSet}
            onChange={(e) => update({ allowDropSet: e.target.checked })}
          />{" "}
          Drop Set
        </label>
        <label>
          <input
            type="checkbox"
            checked={row.allowRestPause}
            onChange={(e) => update({ allowRestPause: e.target.checked })}
          />{" "}
          Rest-pause
        </label>
      </div>
    );
  }
  return (
    <section aria-label={label + "動作管理"}>
      <h3>{label}</h3>
      {rows.map((row, i) => (
        <article
          className="plan-exercise"
          key={i}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (drag !== null && replacement === null)
              change(reordered(rows, drag, i));
            setDrag(null);
          }}
        >
          <h4>
            {i + 1}. {row.name}
          </h4>
          <span
            draggable={replacement === null}
            onDragStart={() => setDrag(i)}
            onDragEnd={() => setDrag(null)}
          >
            拖曳排序
          </span>
          <button
            type="button"
            disabled={!i || replacement !== null}
            onClick={() => change(reordered(rows, i, i - 1))}
          >
            上移動作
          </button>
          <button
            type="button"
            disabled={i + 1 === rows.length || replacement !== null}
            onClick={() => change(reordered(rows, i, i + 1))}
          >
            下移動作
          </button>
          {targets(row, (patch) =>
            change(rows.map((x, j) => (j === i ? { ...x, ...patch } : x))),
          )}
          <button
            type="button"
            onClick={() => {
              reset();
              setReplacement(i);
            }}
          >
            替換 {row.name}
          </button>
          <button
            type="button"
            disabled={replacement !== null}
            onClick={() => change(rows.filter((_, j) => j !== i))}
          >
            移除動作
          </button>
        </article>
      ))}
      <fieldset>
        <legend>
          {replacement === null
            ? "新增動作"
            : "替換 " + rows[replacement]?.name}
        </legend>
        <Field label="搜尋動作">
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected("");
              setPending(null);
            }}
          />
        </Field>
        <Field label="選擇動作">
          <select value={selected} onChange={(e) => select(e.target.value)}>
            <option value="">選擇動作</option>
            {items
              .filter((x) =>
                (x.name + " " + x.nameZh)
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nameZh} · {x.name}
                </option>
              ))}
          </select>
        </Field>
        {pending && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              change(
                replacement === null
                  ? [...rows, pending]
                  : rows.map((x, j) => (j === replacement ? pending : x)),
              );
              reset();
            }}
          >
            {targets(pending, (patch) => setPending({ ...pending, ...patch }))}
            <button className="button">
              確認{replacement === null ? "新增" : "替換"}
            </button>
          </form>
        )}
        {(selected || replacement !== null) && (
          <button type="button" onClick={reset}>
            取消選擇
          </button>
        )}
      </fieldset>
    </section>
  );
}
