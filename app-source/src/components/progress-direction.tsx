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
import { GlassCard, GlassNavigation } from "./ui/glass-system";
export function ProgressDirection({ date }: { date: string }) {
  const { state } = useStore();
  const [range, setRange] = useState("30");
  const start =
    range === "all" ? "0000-01-01" : addDays(date, 1 - Number(range));
  const weights = visibleMeasurements(state).filter(
    (m) => m.date >= start && m.date <= date,
  );
  const sessionsInRange = state.sessions.filter((session) => {
    const recordedDate = session.workoutDate ?? session.date;
    return recordedDate >= start && recordedDate <= date;
  });
  const results = performance({ ...state, sessions: sessionsInRange }),
    improved = results.filter((r) => r.improved),
    comparable = results.filter((r) => r.comparable);
  const stepsInRange = (state.dailySteps ?? []).filter(
    (row) => row.date >= start && row.date <= date,
  );
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
  // GAIN is a 14-day window with >=10 complete food days, per gainReview().
  // Do not redefine nutrition rules from the visual overview.
  const minimumCompleteDays = 10;
  const reviewDataReady = full >= minimumCompleteDays;
  const recoveries = Array.from(
    new Map(
      recoveryEntries(state)
        .filter(
          (r) => r.type === "sleep" && r.unit !== "rating" && r.date >= start && r.date <= date,
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
      <nav className="progress-v3-segments" aria-label="進度分頁">
        <span className="active">Overview</span>
        <Link href="/progress/body">Body</Link>
        <Link href="/progress/training">Strength</Link>
      </nav>
      <GlassCard className={`direction-hero${weights.length===0 ? " direction-hero-empty" : ""}`} aria-label="身體趨勢">
        <GlassNavigation label="趨勢圖期間" value={range}
          onChange={setRange}
          options={["7", "30", "90", "365"].map(r => ({
            key:r, label:r==="365" ? "1Y" : r+"D",
          }))} />
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
        {weights.length < 2 && (
          <Link className="progress-empty-action" href="/progress/body">
            {weights.length === 0 ? "記錄第一筆體重" : "記錄下一筆體重以建立趨勢"}
            <ChevronRight size={17} aria-hidden="true" />
          </Link>
        )}
        <p className="muted">
          {gain
            ? improved.length
              ? "先保留目前飲食，結合體重與恢復再決定是否增加碳水。"
              : "不只看體重；持續記錄相同動作的重量與次數。"
            : "圖表顯示所選期間的變化；是否調整，依下方獨立 Review 判斷。"}
        </p>
      </GlassCard>
      <GlassCard className="progress-v3-photos" aria-label="身體照片日誌">
        <div className="progress-v3-section-header"><h2>Photos</h2><span>BODY JOURNAL</span></div>
        <div className="progress-v3-photo-empty">
          <span aria-hidden="true">◇</span>
          <p>尚無身體照片紀錄</p>
          <small>目前版本未提供照片上傳；不會顯示示意人物照片。</small>
        </div>
      </GlassCard>
      <GlassCard className="progress-v3-stats" aria-label="進度統計">
        <h2>Key Stats</h2>
        <p className="muted">以下數據依上方 {range === "365" ? "1 年" : range + " 天"}區間計算；Weekly Summary 與 Review 使用各自固定期間。</p>
        <div className="progress-v3-stat-row"><span>Workout Sessions</span>
          <strong>{sessionsInRange.filter(session => session.status === "completed").length}</strong></div>
        <div className="progress-v3-stat-row"><span>Avg. Sleep</span>
          <strong>{recoveries.length>=3 ? `${round(recoveries.reduce((a,r)=>a+r.sleep,0)/recoveries.length)} h` : "—"}</strong></div>
        <div className="progress-v3-stat-row"><span>Avg. Steps</span>
          <strong>{stepsInRange.length
            ? Math.round(stepsInRange.reduce((sum, row) => sum + row.steps, 0) / stepsInRange.length).toLocaleString("en-US")
            : "—"}</strong></div>
      </GlassCard>
      <WeeklySummary date={date} />
      <ActivityTrend date={date} />
      <GlassCard className="review-glass" aria-label="進度檢視">
        <p className="eyebrow">PROGRESS REVIEW</p>
        <p>
          {pending
            ? `${pending.periodStart} — ${pending.periodEnd}`
            : `${reviewStart} — ${date}`}
        </p>
        <h2>
          {pending
            ? "有一項調整待確認"
            : !reviewDataReady
              ? "先補足紀錄"
              : "查看評估"}
        </h2>
        <p>
          {pending
            ? "查看觀察資料與調整原因，再選擇 Accept 或 Keep。"
            : `${full} / ${reviewDays} 天完整飲食紀錄。${!reviewDataReady ? `至少需要 ${minimumCompleteDays} 天完整紀錄；實際是否調整仍依 Review 判定。` : "已達飲食紀錄門檻；仍須於 Review 核對其他條件。"}`}
        </p>
        <Link className="jfs-glass-nav-link" href="/progress/review">
          View review <ChevronRight size={18} />
        </Link>
      </GlassCard>
      <GlassCard className="system-status" aria-label="系統狀態">
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
      </GlassCard>
      <GlassCard className="training-evidence" aria-label="訓練進度">
        <p className="eyebrow">TRAINING PROGRESS</p>
        <Link className="text-link" href="/progress/training/exercises">查看單一動作完整歷史 →</Link>
        <h2>
          {activeCycle(state)
            ?.muscleTargets?.filter((m) => m.priority)
            .map((m) => m.muscle)
            .join(" · ") || "Performance"}
        </h2>
        <p className="muted">
          最近兩次相同動作，重量不變且次數提升，或次數不減且重量增加，才標示進步。
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
                    : "資料不足"}
              </small>
            </div>
          ))
        ) : (
          <p className="empty">完成相同動作的兩次紀錄後，這裡會顯示變化。</p>
        )}
        <Link className="text-link" href="/progress/training">
          View training progress <ChevronRight size={16} />
        </Link>
      </GlassCard>
    </div>
  );
}
