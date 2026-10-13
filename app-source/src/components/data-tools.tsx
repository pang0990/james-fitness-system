"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { validateState, visibleMeals, visibleMeasurements, type AppState } from "@/lib/domain";
export function DataTools({ notify }: { notify: (s?: string) => void }) {
  const { state, save } = useStore();
  const [backup, setBackup] = useState<AppState | null>(null),
    [error, setError] = useState("");
  function download(name: string, body: string, type: string) {
    const url = URL.createObjectURL(new Blob([body], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function csv(kind: "nutrition" | "training" | "body" | "recovery") {
    const rows: unknown[][] =
      kind === "nutrition"
        ? [
            ["date", "meal", "name", "protein_g", "carbs_g", "fat_g", "kcal"],
            ...visibleMeals(state).map((m) => [
              m.date,
              m.slot,
              m.name,
              m.p,
              m.c,
              m.f,
              m.kcal,
            ]),
          ]
        : kind === "body"
          ? [
              ["date", "weight_kg"],
              ...visibleMeasurements(state).map((m) => [m.date, m.weight]),
            ]
          : kind === "recovery"
          ? [
              ["date", "record_type", "value", "unit", "area", "side", "safety_level"],
              ...(state.recoveryEntries ?? []).map((entry) => [
                entry.date, entry.type, entry.value, entry.unit ?? "", entry.area ?? "", entry.side ?? "", entry.safetyLevel ?? "",
              ]),
              ...state.recoveries.flatMap((entry) =>
                (["sleep", "fatigue", "stress", "soreness"] as const).map((metric) => [
                  entry.date, "legacy_" + metric, entry[metric], metric === "sleep" ? "minutes" : "rating", "", "", "",
                ])
              ),
            ]
          : [
              [
                "date",
                "status",
                "session",
                "exercise",
                "type",
                "weight_kg",
                "reps",
                "rir",
              ],
              ...state.sessions.filter((s) => s.status === "completed").flatMap((s) =>
                s.exercises.flatMap((e) =>
                  e.sets.map((t) => [
                    s.workoutDate ?? s.date,
                    s.status,
                    s.name,
                    e.name,
                    t.type,
                    t.weight,
                    t.reps,
                    t.rir,
                  ]),
                ),
              ),
            ];
    download(
      `james-${kind}.csv`,
      "\uFEFF" +
        rows
          .map((r) =>
            r
              .map(
                (v) =>
                  '"' +
                  String(v ?? "")
                    .replace(/^[=+@-]/, "'$&")
                    .replaceAll('"', '""') +
                  '"',
              )
              .join(","),
          )
          .join("\r\n"),
      "text/csv;charset=utf-8",
    );
  }
  return (
    <section className="card stack">
      <h2>還原與分類匯出</h2>
      <div className="two-actions">
        {(["nutrition", "training", "body", "recovery"] as const).map((k) => (
          <button className="button secondary" key={k} onClick={() => csv(k)}>
            {k} CSV
          </button>
        ))}
      </div>
      <label className="field">
        <span>匯入 JSON 備份</span>
        <input
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            setError("");
            setBackup(null);
            try {
              const file = e.target.files?.[0];
              if (file) setBackup(validateState(JSON.parse(await file.text())));
            } catch {
              setError("備份格式無效，未更動任何紀錄。");
            }
          }}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      {backup && (
        <>
          <p>
            備份包含 {backup.meals.length} 筆飲食、{backup.sessions.length}{" "}
            次訓練、{backup.measurements.length}{" "}
            筆身體紀錄。還原會取代目前本機資料。
          </p>
          <button
            className="button danger"
            onClick={() => {
              if (
                !confirm(
                  "確定以此備份取代目前資料？會先下載目前資料的安全備份。",
                )
              )
                return;
              download(
                "james-before-restore.json",
                JSON.stringify(state, null, 2),
                "application/json",
              );
              if (
                save("還原備份", (s) => {
                  const revision = s.revision;
                  for (const key of Object.keys(s))
                    delete (s as unknown as Record<string, unknown>)[key];
                  Object.assign(s, structuredClone(backup));
                  s.revision = revision;
                })
              ) {
                setBackup(null);
                notify("備份已還原");
              }
            }}
          >
            確認還原備份
          </button>
        </>
      )}
      <button
        className="button secondary"
        onClick={async () => {
          try {
            if ("caches" in window)
              await Promise.all(
                (await caches.keys())
                  .filter(
                    (k) =>
                      k.toLowerCase().includes("james") || k.startsWith("jfs"),
                  )
                  .map((k) => caches.delete(k)),
              );
            notify("快取已清除，健身紀錄保留");
          } catch {
            setError("無法清除快取");
          }
        }}
      >
        只清除離線快取
      </button>
    </section>
  );
}
