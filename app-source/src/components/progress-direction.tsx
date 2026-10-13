"use client";
import Link from "next/link";
import { WeeklySummary } from "./weekly-summary";
import { ActivityTrend } from "./activity-trend";
import { recoveryEntries } from "@/lib/recovery";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { addDays, round, visibleMeasurements } from "@/lib/domain";
import { activeCycle, performance } from "@/lib/training-model";
import { LineChart } from "./trends";
import { PageTitle } from "./daily";
export function ProgressDirection({ date }: { date: string }) {
  const { state } = useStore();
  const [range, setRange] = useState("30");
  const start =
    range === "all" ? "0000-01-01" : addDays(date, 1 - Number(range));
  const weights = visibleMeasurements(state).filter(
    (m) => m.date >= start && m.date <= date,
  );
  const results = performance(state),
    improved = results.filter((r) => r.improved),
    comparable = results.filter((r) => r.comparable);
  const gain = state.profile?.goal === "GAIN";
  const delta =
    weights.length > 1
      ? round(weights.at(-1)!.weight - weights[0].weight)
      : null;
  const reviewDays = gain ? 14 : 10;
  const reviewStart = addDays(date, 1 - reviewDays);
  const full = state.days.filter(
    (d) => d.date >= reviewStart && d.date <= date && d.complete,
  ).length;
  const recoveries = Array.from(
    new Map(
      recoveryEntries(state)
        .filter(
          (r) => r.type === "sleep" && r.unit !== "rating" && r.date >= reviewStart && r.date <= date,
        )
        .map((r) => [r.date, { ...r, sleep: r.value / 60 }]),
    ).values(),
  );
  const pending = state.recommendations.find((r) => r.status === "pending");
  const status = gain
    ? improved.length
      ? "PROGRESSING"
      : "OBSERVING"
    : delta === null
      ? "NOT ENOUGH DATA"
      : delta < 0
        ? "WEIGHT DECREASING"
        : "OBSERVING";
  return (
    <div className="daily-page progress-direction">
      <PageTitle title="Progress" />
      <WeeklySummary date={date} />
      <ActivityTrend date={date} />
      <section className="direction-hero">
        <div className="range-control" aria-label="趨勢圖期間">
          {["7", "30", "all"].map((r) => (
            <button
              key={r}
              aria-pressed={r === range}
              onClick={() => setRange(r)}
            >
              {r === "all" ? "ALL" : r + "D"}
            </button>
          ))}
        </div>
        <p className="eyebrow">{status}</p>
        <h2>
          {gain
            ? improved.length
              ? "訓練表現持續提升"
              : "觀察體重與訓練表現"
            : delta === null
              ? "繼續建立趨勢"
              : delta < 0
                ? "體重正在下降"
                : "觀察目前方向"}
        </h2>
        <div className="direction-evidence">
          <strong>
            {weights.at(-1)?.weight ?? "—"}
            <small> kg</small>
          </strong>
          <span>
            {delta === null
              ? "體重紀錄不足"
              : `${delta > 0 ? "+" : ""}${delta} kg · ${weights[0].date} — ${weights.at(-1)!.date}`}
          </span>
        </div>
        <LineChart
          points={weights.map((w) => ({ date: w.date, value: w.weight }))}
          unit="kg"
          large
        />
        <p className="muted">
          {gain
            ? improved.length
              ? "先保留目前飲食，結合體重與恢復再決定是否增加碳水。"
              : "不只看體重；持續記錄相同動作的重量、次數及 RIR。"
            : "圖表顯示所選期間的變化；是否調整，依下方獨立 Review 判斷。"}
        </p>
      </section>
      <section className="review-glass">
        <p className="eyebrow">PROGRESS REVIEW</p>
        <p>
          {pending
            ? `${pending.periodStart} — ${pending.periodEnd}`
            : `${reviewStart} — ${date}`}
        </p>
        <h2>
          {pending
            ? "有一項調整待確認"
            : full < (gain ? 10 : 10)
              ? "先補足紀錄"
              : "檢視計畫"}
        </h2>
        <p>
          {pending
            ? "查看觀察資料與調整原因，再選擇 Accept 或 Keep。"
            : `${full} / ${reviewDays} 天完整飲食紀錄。${full < 10 ? "目前不據此推定需要修改計畫。" : "開啟 Review，檢視本期證據。"}`}
        </p>
        <Link
          className="button"
          href={pending ? "/progress/review" : "/progress/review"}
        >
          View review <ChevronRight size={18} />
        </Link>
      </section>
      <section className="system-status">
        <p className="eyebrow">SYSTEM STATUS</p>
        {[
          [
            "body",
            "BODY",
            delta === null ? "資料不足" : `${delta > 0 ? "+" : ""}${delta} kg`,
          ],
          ["nutrition", "NUTRITION", `${full} / ${reviewDays} 天完整紀錄`],
          [
            "training",
            "TRAINING",
            comparable.length
              ? `${improved.length} / ${comparable.length} 動作進步`
              : "待累積可比較紀錄",
          ],
          [
            "recovery",
            "RECOVERY",
            recoveries.length < 3
              ? `${recoveries.length} 天紀錄 · 資料不足`
              : `睡眠 ${round(recoveries.reduce((a, r) => a + r.sleep, 0) / recoveries.length)} h`,
          ],
        ].map(([route, title, summary]) => (
          <Link className="status-row" href={"/progress/" + route} key={route}>
            <strong>{title}</strong>
            <span>{summary}</span>
            <ChevronRight size={18} />
          </Link>
        ))}
      </section>
      <section className="training-evidence">
        <p className="eyebrow">TRAINING PROGRESS</p>
        <Link className="text-link" href="/progress/training/exercises">查看單一動作完整歷史 →</Link>
        <h2>
          {activeCycle(state)
            ?.muscleTargets?.filter((m) => m.priority)
            .map((m) => m.muscle)
            .join(" · ") || "Performance"}
        </h2>
        <p className="muted">
          最近兩次相同動作 · 相同或更高 RIR、重量與次數均未下降，才標示進步。
        </p>
        {results.length ? (
          results.slice(0, 3).map((r) => (
            <div className="performance-row" key={r.name}>
              <strong>{r.name}</strong>
              <span>
                {r.before.weight} × {r.before.reps} → {r.after.weight} ×{" "}
                {r.after.reps}
              </span>
              <small>
                {r.improved
                  ? "↑ Improving"
                  : r.comparable
                    ? "持續觀察"
                    : "RIR 不足以比較"}
              </small>
            </div>
          ))
        ) : (
          <p className="empty">完成相同動作的兩次紀錄後，這裡會顯示變化。</p>
        )}
        <Link className="text-link" href="/progress/training">
          View training progress <ChevronRight size={16} />
        </Link>
      </section>
    </div>
  );
}
