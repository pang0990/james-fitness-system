"use client";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { activePlan, round, addDays } from "@/lib/domain";
import {
  GAIN_RULE,
  gainReview,
  applyGainDecision,
  type GainSettings,
} from "@/lib/gain";
import { Field, Sheet, PageTitle } from "./daily";
export function GainReview({
  date,
  notify,
}: {
  date: string;
  notify: (s?: string) => void;
}) {
  const { state, save } = useStore();
  const review = gainReview(state, date),
    currentPlan = activePlan(state, date),
    plan = currentPlan?.inputs.goal === "GAIN" ? currentPlan : null;
  const [preview, setPreview] = useState<string | null>(null);
  function update(patch: Partial<GainSettings>) {
    save("確認 GAIN 本期條件", (s) => {
      s.gainSettings = {
        level: "intermediate",
        proteinFatConfirmed: false,
        startCarbsConfirmed: false,
        adherenceConfirmed: false,
        recoveryConfirmed: false,
        ...s.gainSettings,
        ...patch,
      };
    });
  }
  return (
    <div className="daily-page">
      <PageTitle title="GAIN Review" />
      <p>
        {review.start} — {review.end}
      </p>
      <p className="eyebrow">
        {plan ? "GAIN TREND" : "BASELINE TRACKING"} · {GAIN_RULE}
      </p>
      <div className="stat-pair">
        <div>
          <small>Week A</small>
          <strong>
            {review.weekA === null ? "—" : round(review.weekA, 2)} kg
          </strong>
        </div>
        <div>
          <small>Week B</small>
          <strong>
            {review.weekB === null ? "—" : round(review.weekB, 2)} kg
          </strong>
        </div>
      </div>
      <p>
        體重 {review.weights} / 14 天 · 完整飲食 {review.complete} / 14 天
      </p>
      <p>
        週平均變化 {review.rate === null ? "—" : `${round(review.rate, 2)}%`}
      </p>
      <Field label="訓練程度">
        <select
          value={state.gainSettings?.level ?? ""}
          onChange={(e) =>
            update({ level: e.target.value as GainSettings["level"] })
          }
        >
          <option value="" disabled>
            選擇訓練程度
          </option>
          <option value="beginner">Beginner · 0.25–0.50% / week</option>
          <option value="intermediate">Intermediate · 0.20–0.35% / week</option>
          <option value="advanced">Advanced · 0.10–0.25% / week</option>
        </select>
      </Field>
      <details>
        <summary>確認本期執行條件</summary>
        <p className="muted">
          以下為本期自我確認，不以完整紀錄推定營養達標或恢復正常。
        </p>
        {(
          [
            ["proteinFatConfirmed", "蛋白質與脂肪攝取已足夠"],
            [
              "startCarbsConfirmed",
              "初始碳水接近 3 g/kg，適用 James +1 g/kg 起始規則",
            ],
            ["adherenceConfirmed", "本期至少九成天數有依計畫執行"],
            ["recoveryConfirmed", "本期沒有明顯睡眠、疲勞或壓力問題"],
          ] as const
        ).map(([key, label]) => (
          <label className="check" key={key}>
            <input
              type="checkbox"
              checked={state.gainSettings?.[key] ?? false}
              onChange={(e) => update({ [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </details>
      <section className="review-glass">
        <h2>
          {review.actionable
            ? review.delta
              ? `Carbs ${review.delta > 0 ? "+" : ""}${review.delta} g / day`
              : "建立實際飲食基準"
            : "Keep / Observe"}
        </h2>
        <p>{review.reason}</p>
        {review.actionable && (
          <button
            className="button"
            onClick={() => setPreview(JSON.stringify(review))}
          >
            Preview change
          </button>
        )}
      </section>
      <details className="source-details">
        <summary>規則與研究來源</summary>
        <p>
          14 天、每週至少 5 天體重、10 天完整飲食、±0.25% 基準、±25 g 調整是
          James 產品參數，不是生理定律。
        </p>
        <a
          href="https://pubmed.ncbi.nlm.nih.gov/37914977/"
          target="_blank"
          rel="noreferrer"
        >
          能量盈餘與訓練研究
        </a>
        <br />
        <a
          href="https://help.rpstrength.com/hc/en-us/articles/34706604309783-How-to-choose-an-effective-muscle-gain-phase"
          target="_blank"
          rel="noreferrer"
        >
          RP 增重速度實務
        </a>
      </details>
      <Link className="text-link" href="/progress/history">
        Previous decisions →
      </Link>
      {preview && (
        <Sheet title="Preview change" onClose={() => setPreview(null)}>
          <p>{review.reason}</p>
          <p>
            每日碳水 {review.delta > 0 ? "+" : ""}
            {review.delta} g · 參考熱量 {review.delta > 0 ? "+" : ""}
            {review.delta * 4} kcal
          </p>
          <p>Protein / Fat 不變 · {addDays(date, 1)} 生效</p>
          {(["training", "light", "rest"] as const).map((d) => (
            <p key={d}>
              {d} · C {(plan?.targets[d] ?? review.baseline).c} →{" "}
              {round((plan?.targets[d] ?? review.baseline).c + review.delta)} g
            </p>
          ))}
          <div className="two-actions">
            <button
              className="button"
              onClick={() => {
                if (
                  save("Accept GAIN Recommendation", (s) =>
                    applyGainDecision(s, date, true, preview),
                  )
                ) {
                  setPreview(null);
                  notify("新版本已建立，隔日生效");
                }
              }}
            >
              Accept
            </button>
            <button
              className="button secondary"
              onClick={() => {
                if (
                  save("Keep GAIN Plan", (s) =>
                    applyGainDecision(s, date, false, preview),
                  )
                ) {
                  setPreview(null);
                  notify("保留目前計畫");
                }
              }}
            >
              Keep current
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
