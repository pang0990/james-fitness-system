"use client";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { activeCycle } from "@/lib/training-model";
import {trainingProgressEvidence,weeklyWorkingVolume,TRAINING_PERFORMANCE_RULE_VERSION} from "@/lib/training-performance";
import {trainingSafetyReview} from "@/lib/training-review-evidence";
import { uid } from "./daily";
export function TrainingReview({ date }: { date: string }) {
  const { state, save } = useStore();
  const [recovery, setRecovery] = useState(false),
    [message, setMessage] = useState("");
  const plan = activeCycle(state);
  const rows = trainingProgressEvidence(state),
    improving = rows.some((r) => r.outcome === "improved");
  const weekly=weeklyWorkingVolume(state,date), safety=trainingSafetyReview(state,date);
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
      <p className="muted">規則：{TRAINING_PERFORMANCE_RULE_VERSION} · 本週 Working Sets {weekly.totalWorkingSets} · {weekly.start}～{weekly.end}</p>
      {weekly.unassigned>0 && <p className="muted">{weekly.unassigned} 組缺少主要肌群標記，不猜測其歸屬。</p>}
      <div className="training-review-evidence">
        <h3>相同動作表現比較</h3>
        {rows.length ? rows.map(item=><div className="simple-row" key={item.key}>
          <div className="stack">
            <strong>{item.name}</strong>
            <small>{item.before.date}：{item.before.weight} kg × {item.before.reps} · RIR {item.before.rir??"未填"}</small>
            <small>{item.after.date}：{item.after.weight} kg × {item.after.reps} · RIR {item.after.rir??"未填"}</small>
            <small>{item.reason} · e1RM 變化 {item.e1rmChangePercent===null?"無法估算":item.e1rmChangePercent.toFixed(1)+"%"}</small>
          </div>
        </div>):<p className="muted">需要相同動作兩次已完成訓練；不同 Library ID 不會依名稱強行合併。</p>}
      </div>
      <section className="card stack" aria-label="Deload 與恢復評估">
        <h3>Deload Check · {safety.title}</h3>
        <p>{safety.explanation}</p>
        <p className="muted">可比較動作 {safety.comparableExercises} · 有進步證據 {safety.improvedExercises} · 近期恢復紀錄 {safety.recoveryEvidenceCount}</p>
        {safety.painDescription && <p role="alert">{safety.painDescription}</p>}
        <p className="muted">只評估，不自動變更課表或歷史；請先確認計畫版本的調整。</p>
        <Link href="/progress/recovery" className="text-link">查看疼痛與恢復紀錄 →</Link>
      </section>
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
