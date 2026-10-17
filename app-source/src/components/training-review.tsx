"use client";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { activeCycle, performance } from "@/lib/training-model";
import { uid } from "./daily";
export function TrainingReview({ date }: { date: string }) {
  const { state, save } = useStore();
  const [recovery, setRecovery] = useState(false),
    [message, setMessage] = useState("");
  const plan = activeCycle(state);
  const rows = performance(state).filter((r) => r.comparable),
    improving = rows.some((r) => r.improved);
  if (!plan) return null;
  const reason = !rows.length
    ? "資料不足，繼續記錄相同動作的重量與次數，才能比較表現。"
    : improving
      ? "Intensity still progressing · 目前保留訓練頻率與組數。"
      : !recovery
        ? "訓練表現尚未提升，先確認恢復與執行情況。"
        : "Consider Frequency · 可先檢視 Training Days 的安排。";
  return (
    <section className="review-glass">
      <p className="eyebrow">
        JAMES TRAINING REVIEW · {plan.stage ?? "Intensity"}
      </p>
      <p>{reason}</p>
      {!improving && !!rows.length && (
        <label className="check">
          <input
            type="checkbox"
            checked={recovery}
            onChange={(e) => setRecovery(e.target.checked)}
          />
          本期恢復正常，且有依計畫完成訓練
        </label>
      )}
      {recovery && !improving && !!rows.length && (
        <Link className="button secondary" href="/training/plan">
          檢視 Training Days 並預覽調整 →
        </Link>
      )}
      <button
        className="button secondary"
        onClick={() => {
          if (
            save("Keep Training Plan", (s) => {
              (s.trainingDecisions ??= []).push({
                id: uid(),
                date,
                cycleId: plan.id,
                status: "kept",
                reason,
              });
            })
          )
            setMessage("已保留目前計畫");
        }}
      >
        Keep current
      </button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
