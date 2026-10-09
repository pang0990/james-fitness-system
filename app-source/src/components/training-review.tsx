"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  activeCycle,
  performance,
  type MuscleTarget,
} from "@/lib/training-model";
import { MuscleEditor } from "./training-planning";
import { Sheet, uid, stamp } from "./daily";
export function TrainingReview({ date }: { date: string }) {
  const { state, save } = useStore();
  const cycle = activeCycle(state);
  const results = performance(state).filter((r) => r.comparable);
  const improving = results.some((r) => r.improved);
  const [recovery, setRecovery] = useState(false),
    [preview, setPreview] = useState(false),
    [targets, setTargets] = useState<MuscleTarget[]>(
      cycle?.muscleTargets ?? [],
    );
  const [error, setError] = useState("");
  const pending = state.cycles?.some(
    (c) =>
      c.id !== cycle?.id &&
      c.activateAfter &&
      c.activateAfter.cycleId === cycle?.id,
  );
  const canFrequency = !cycle?.stage || cycle.stage === "Intensity";
  const reason = !canFrequency
    ? `目前處於 ${cycle?.stage}，請依本期紀錄檢視下一階段。`
    : !results.length
      ? "還沒有足夠的相同動作、重量、次數與 RIR 紀錄。"
      : improving
        ? "Intensity still progressing · 保留目前頻率與組數。"
        : !recovery
          ? "訓練表現尚未提升，先確認恢復與執行狀況。"
          : "Consider Frequency · 可先檢視優先肌群的訓練頻率。";
  if (!cycle) return null;
  return (
    <section className="review-glass">
      <p className="eyebrow">
        JAMES TRAINING REVIEW · {cycle.stage ?? "Intensity"}
      </p>
      <p>{reason}</p>
      {!improving && results.length > 0 && (
        <label className="check">
          <input
            type="checkbox"
            checked={recovery}
            onChange={(e) => setRecovery(e.target.checked)}
          />
          本期恢復正常，且有依計畫完成訓練
        </label>
      )}
      {pending ? (
        <p>已有下一個 Cycle 的待生效版本。</p>
      ) : canFrequency && recovery && !improving && results.length > 0 ? (
        <button className="button secondary" onClick={() => setPreview(true)}>
          Preview Frequency change
        </button>
      ) : null}
      {preview && (
        <Sheet
          title="下一個 Cycle · Frequency"
          onClose={() => setPreview(false)}
        >
          <p>選擇要調整的肌群與分配日；只有按 Accept 才建立版本。</p>
          <MuscleEditor
            value={targets}
            onChange={setTargets}
            dayCount={cycle.days.length}
          />
          {error && <p role="alert">{error}</p>}
          <div className="two-actions">
            <button
              className="button"
              onClick={() => {
                if (
                  !targets.length ||
                  targets.some(
                    (t) => t.target > 0 && t.frequency !== t.allocation.length,
                  )
                ) {
                  setError(
                    "每個已設定肌群的 Frequency 需與所選 Cycle 日數一致。",
                  );
                  return;
                }
                if (
                  JSON.stringify(targets) ===
                  JSON.stringify(cycle.muscleTargets ?? [])
                ) {
                  setError("請先選擇變更，或 Keep current。");
                  return;
                }
                save("Accept Training Frequency", (s) => {
                  if (activeCycle(s)?.id !== cycle.id)
                    throw Error("Cycle 已更新，請重新評估");
                  const count =
                    s.cycleEvents?.filter((e) => e.cycleId === cycle.id)
                      .length ?? 0;
                  const nextId = uid();
                  (s.cycles ??= []).push({
                    ...structuredClone(cycle),
                    id: nextId,
                    previousId: cycle.id,
                    createdAt: stamp(),
                    stage: "Frequency",
                    muscleTargets: targets,
                    activateAfter: {
                      cycleId: cycle.id,
                      eventCount:
                        Math.ceil((count || 1) / cycle.days.length) *
                        cycle.days.length,
                    },
                  });
                  (s.trainingDecisions ??= []).push({
                    id: uid(),
                    date,
                    cycleId: cycle.id,
                    status: "accepted",
                    reason,
                    newCycleId: nextId,
                  });
                });
                setPreview(false);
              }}
            >
              Accept · 下一個 Cycle
            </button>
            <button
              className="button secondary"
              onClick={() => {
                save("Keep Training Plan", (s) =>
                  (s.trainingDecisions ??= []).push({
                    id: uid(),
                    date,
                    cycleId: cycle.id,
                    status: "kept",
                    reason,
                  }),
                );
                setPreview(false);
              }}
            >
              Keep current
            </button>
          </div>
        </Sheet>
      )}
    </section>
  );
}
