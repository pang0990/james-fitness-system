"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { type RecoveryEntry, visibleMeasurements, pinDay } from "@/lib/domain";
import {
  latestRecovery,
  recoveryEntries,
  painLevel,
  safetyText,
} from "@/lib/recovery";
import { Sheet, Field, Num, uid, stamp } from "./daily";
export const labels = {
  sleep: "睡眠",
  fatigue: "疲勞",
  stress: "壓力",
  soreness: "肌肉痠痛",
  pain: "疼痛",
};
const areas = [
  "Neck / Traps",
  "Chest",
  "Shoulders",
  "Upper Back",
  "Lats",
  "Lower Back",
  "Biceps",
  "Triceps",
  "Forearms",
  "Abs / Core",
  "Glutes",
  "Quads",
  "Hamstrings",
  "Adductors",
  "Calves",
];
export function RecoveryQuickLog({
  date,
  close,
  notify,
}: {
  date: string;
  close: () => void;
  notify: (s?: string) => void;
}) {
  const { state, save } = useStore();
  const [kind, setKind] = useState<
    RecoveryEntry["type"] | "weight" | "nutrition"
  >("sleep");
  const [message, setMessage] = useState("");
  const recent = latestRecovery(state, date)
    .filter((r) => r.type === kind)
    .at(-1);
  return (
    <Sheet title={`${date} · 快速紀錄`} onClose={close}>
      <Field label="紀錄項目">
        <select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as typeof kind);
            setMessage("");
          }}
        >
          {Object.entries({
            ...labels,
            weight: "體重",
            nutrition: "飲食紀錄完整度",
          }).map(([k, v]) => (
            <option value={k} key={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <form
        key={kind}
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          const value = Number(d.get("value"));
          const flags = ["red", "sharp", "worsening"].filter(
            (k) => d.get(k) === "on",
          );
          const level = kind === "pain" ? painLevel(value, flags) : undefined;
          if (
            save("記錄 " + kind, (s) => {
              if (kind === "weight") {
                s.measurements.push({
                  id: uid(),
                  date,
                  weight: value,
                  createdAt: stamp(),
                  supersedes: visibleMeasurements(s)
                    .filter((x) => x.date === date)
                    .at(-1)?.id,
                });
              } else if (kind === "nutrition") {
                pinDay(s, date);
                s.days.find((x) => x.date === date)!.complete =
                  d.get("complete") === "on";
              } else {
                (s.recoveryEntries ??= []).push({
                  id: uid(),
                  date,
                  type: kind,
                  value,
                  area: String(d.get("area") ?? "") || undefined,
                  side: String(d.get("side") ?? "") || undefined,
                  safetyLevel: level,
                  flags,
                  createdAt: stamp(),
                });
              }
            })
          ) {
            setMessage(level ? safetyText[level] : "已儲存，歷史紀錄保留");
            notify("已儲存");
          }
        }}
      >
        {kind === "nutrition" ? (
          <label className="check">
            <input
              name="complete"
              type="checkbox"
              defaultChecked={state.days.find((d) => d.date === date)?.complete}
            />
            這天飲食已記錄完整
          </label>
        ) : (
          <Num
            label={
              kind === "sleep"
                ? "睡眠分鐘（歸起床當天）"
                : kind === "weight"
                  ? "體重 kg"
                  : kind === "pain"
                    ? "疼痛 0–10"
                    : kind === "soreness"
                      ? "痠痛 0–5"
                      : "程度 1–5"
            }
            name="value"
            min={
              kind === "weight"
                ? 30
                : kind === "fatigue" || kind === "stress"
                  ? 1
                  : 0
            }
            max={
              kind === "sleep"
                ? 1440
                : kind === "weight"
                  ? 350
                  : kind === "pain"
                    ? 10
                    : 5
            }
            step={kind === "weight" ? "0.1" : "1"}
            value={recent?.value}
          />
        )}
        {(kind === "soreness" || kind === "pain") && (
          <>
            <Field label="部位">
              <select name="area">
                {(kind === "pain"
                  ? [
                      "Neck",
                      "Shoulder",
                      "Elbow",
                      "Wrist / Hand",
                      "Upper Back",
                      "Lower Back",
                      "Hip",
                      "Knee",
                      "Ankle / Foot",
                      "Other",
                    ]
                  : areas
                ).map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </Field>
            <Field label="左右側">
              <select name="side">
                <option>Both</option>
                <option>Left</option>
                <option>Right</option>
              </select>
            </Field>
          </>
        )}
        {kind === "pain" && (
          <>
            <p>肌肉痠痛請用「肌肉痠痛」記錄。以下症狀優先於疼痛分數。</p>
            {[
              [
                "red",
                "突發嚴重疼痛、外傷變形、不能負重、胸痛、昏厥或明顯麻木／無力",
              ],
              ["sharp", "銳痛、刺痛、關節痛或動作代償"],
              ["worsening", "疼痛持續或逐組惡化"],
            ].map(([k, l]) => (
              <label className="check" key={k}>
                <input name={k} type="checkbox" />
                {l}
              </label>
            ))}
          </>
        )}
        <button className="button">儲存紀錄</button>
        {message && <p role="status">{message}</p>}
      </form>
    </Sheet>
  );
}
export function RecoveryHistory() {
  const { state } = useStore();
  return (
    <section className="stack">
      <h2>Recovery History</h2>
      {recoveryEntries(state)
        .slice()
        .reverse()
        .map((r) => (
          <div className="simple-row" key={r.id}>
            <span>
              {r.date} · {labels[r.type]} {r.area} {r.side}
            </span>
            <strong>
              {r.value}
              {r.type === "sleep" ? " min" : r.type === "pain" ? "/10" : "/5"}
            </strong>
          </div>
        ))}
      {!recoveryEntries(state).length && <p>尚未紀錄</p>}
    </section>
  );
}
