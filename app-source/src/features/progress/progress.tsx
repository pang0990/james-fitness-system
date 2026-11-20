"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Check,
  ClipboardList,
  Dumbbell,
  History,
  Plus,
  SlidersHorizontal,
  Sun,
  TrendingUp,
  Utensils,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  activityEvidenceForReview,
  activePlan,
  addDays,
  cutReview,
  dayNames,
  daysBetween,
  decide,
  mealTotals,
  round,
  RULE_ID,
  visibleMeals,
  visibleMeasurements,
  type DayType,
  type Recommendation,
} from "@/lib/domain";

import {
  Heading,
  Card,
  Empty,
  Field,
  NumberField,
  DateField,
  TargetTable,
} from "@/components/ui/page-content";
import { uid as id, stamp as now } from "@/components/daily";
function ProgressLinks({ path }: { path: string }) {
  return (
    <Link href="/progress" className="text-link">
      ← Progress
    </Link>
  );
}

export function Progress({
  path,
  date,
  notify,
}: {
  path: string;
  date: string;
  notify: (m?: string) => void;
}) {
  const { state, save } = useStore();
  const [range, setRange] = useState("7");
  const measurements = visibleMeasurements(state);
  const start =
    range === "all" ? "0000-01-01" : addDays(date, -Number(range) + 1);
  const points = measurements.filter((m) => m.date >= start && m.date <= date);
  const days = state.days.filter((d) => d.date >= start && d.date <= date);
  const recovery = state.recoveries.filter(
    (r) => r.date >= start && r.date <= date,
  );
  const sessions = state.sessions.filter(
    (s) => s.date >= start && s.date <= date && s.status === "completed",
  );
  const sets = sessions.flatMap((s) => s.exercises.flatMap((e) => e.sets));
  const [measureDate, setMeasureDate] = useState(date);
  function measure(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const weight = Number(new FormData(e.currentTarget).get("weight"));
    if (
      save("新增／修正體重測量", (s) => {
        const old = visibleMeasurements(s).find((m) => m.date === measureDate);
        s.measurements.push({
          id: id(),
          date: measureDate,
          weight,
          createdAt: now(),
          ...(old ? { supersedes: old.id } : {}),
        });
      })
    ) {
      notify();
      e.currentTarget.reset();
    }
  }
  return (
    <>
      <Heading
        eyebrow=""
        title={
          path === "progress/history"
            ? "Plan Changes"
            : path === "progress/weekly"
              ? "Weekly Review"
              : "Progress"
        }
      />
      <ProgressLinks path={path} />
      {path === "progress/history" ? (
        <Card title="Nutrition Version History" icon={History}>
          {state.versions.length ? (
            state.versions
              .slice()
              .reverse()
              .map((v) => (
                <div className="version" key={v.id}>
                  <h3>
                    Nutrition v{v.number}
                    <span className="tag">
                      {v.effectiveDate > date
                        ? "隔日生效"
                        : activePlan(state, date)?.id === v.id
                          ? "目前使用"
                          : "歷史版本"}
                    </span>
                  </h3>
                  <p>{v.reason}</p>
                  <p>
                    生效 {v.effectiveDate} · {v.ruleId}
                  </p>
                  <TargetTable targets={v.targets} />
                </div>
              ))
          ) : (
            <Empty
              title="尚未建立版本"
              detail="確認初始計畫或採用調整後，會記錄在這裡。"
              href="/onboarding"
            />
          )}
          <div className="divider" />
          <h3>GAIN 決策</h3>
          {state.gainDecisions
            ?.slice()
            .reverse()
            .map((d) => (
              <div className="list-row" key={d.id}>
                <p>
                  {d.periodStart} — {d.periodEnd}
                  <br />
                  {d.status === "accepted" ? "Accepted" : "Keep Current"} ·{" "}
                  {d.reason}
                </p>
              </div>
            ))}
          <h3>Training Versions</h3>
          {state.cycles
            ?.slice()
            .reverse()
            .map((c, i) => (
              <div className="list-row" key={c.id}>
                <p>
                  {c.name} · {c.stage ?? "Intensity"}
                  <br />
                  {c.days.map((d) => d.name).join(" → ")}
                  <br />
                  {c.createdAt.slice(0, 10)}
                </p>
              </div>
            ))}
          <h3>操作歷史</h3>
          {state.audit
            .slice(-12)
            .reverse()
            .map((a) => (
              <div className="list-row" key={a.id}>
                <span className="grow">{a.action}</span>
                <small className="muted">
                  {new Date(a.at).toLocaleString("zh-TW")}
                </small>
              </div>
            ))}
        </Card>
      ) : path === "progress/recommendations" ? (
        <Recommendations date={date} notify={notify} />
      ) : (
        <>
          <div className="toolbar">
            <div className="pill-row">
              {[
                ["7", "7 Days"],
                ["30", "30 Days"],
                ["all", "All Time"],
              ].map(([v, l]) => (
                <button
                  key={v}
                  style={
                    range === v ? { background: "#263020", color: "#fff" } : {}
                  }
                  onClick={() => setRange(v)}
                >
                  {l}
                </button>
              ))}
            </div>
            <span className="muted" style={{ fontSize: 11 }}>
              截止 {date} · 日曆日統計
            </span>
          </div>
          <div className="stats-grid">
            <div className="stat">
              <small>最近實測體重</small>
              <strong>
                {points.at(-1)?.weight ?? "—"}
                <small> kg</small>
              </strong>
              <small>{points.length} 筆實測</small>
            </div>
            <div className="stat">
              <small>飲食記錄完整</small>
              <strong>
                {days.filter((d) => d.complete).length}
                <small> 天</small>
              </strong>
              <small>未記錄不視為零攝取</small>
            </div>
            <div className="stat">
              <small>完成訓練</small>
              <strong>
                {sessions.length}
                <small> 次</small>
              </strong>
              <small>
                {sets.filter((s) => s.type === "working").length} 主要工作組
              </small>
            </div>
            <div className="stat">
              <small>恢復紀錄</small>
              <strong>
                {new Set(recovery.map((r) => r.date)).size}
                <small> 天</small>
              </strong>
              <small>睡眠・疲勞・壓力</small>
            </div>
          </div>
          {(path === "progress" || path === "progress/body") && (
            <div className="dashboard-grid">
              <Card title="體重的變化" kicker="BODY TREND" icon={TrendingUp}>
                {points.length >= 2 ? (
                  <>
                    <WeightChart points={points} />
                    <div className="chart-labels">
                      <span>{points[0].date}</span>
                      <span>{points.at(-1)!.date}</span>
                    </div>
                  </>
                ) : (
                  <Empty
                    title="讓趨勢慢慢出現"
                    detail="目前範圍至少需要兩筆不同日期的實測體重。"
                  />
                )}
                {points.map((m) => (
                  <div className="list-row" key={m.id}>
                    <span className="grow">{m.date}</span>
                    <strong>{m.weight} kg</strong>
                  </div>
                ))}
              </Card>
              <Card title="記下今天的起點" icon={Plus}>
                <form onSubmit={measure}>
                  <div className="stack">
                    <Field label="測量日期">
                      <DateField
                        value={measureDate}
                        onChange={setMeasureDate}
                      />
                    </Field>
                    <NumberField
                      name="weight"
                      label="體重 kg"
                      min={30}
                      max={350}
                    />
                  </div>
                  <div className="form-actions">
                    <button className="button">
                      保存測量
                      <Check size={14} />
                    </button>
                  </div>
                </form>
                <p className="muted" style={{ fontSize: 11, marginTop: 18 }}>
                  同一天重新輸入視為修正，原始紀錄仍保留。不自動沿用昨日體重。
                </p>
              </Card>
            </div>
          )}
          {path === "progress/nutrition" && (
            <Card title="Nutrition History" icon={Utensils}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>日期</th>
                      <th>P</th>
                      <th>C</th>
                      <th>F</th>
                      <th>kcal</th>
                      <th>紀錄完整</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ...new Set([
                        ...days.map((d) => d.date),
                        ...visibleMeals(state)
                          .filter((m) => m.date >= start && m.date <= date)
                          .map((m) => m.date),
                      ]),
                    ]
                      .sort()
                      .reverse()
                      .map((d) => {
                        const t = mealTotals(state, d);
                        return (
                          <tr key={d}>
                            <td>{d}</td>
                            <td>{t.p}</td>
                            <td>{t.c}</td>
                            <td>{t.f}</td>
                            <td>{t.kcal}</td>
                            <td>
                              {days.find((x) => x.date === d)?.complete
                                ? "完整"
                                : "未確認"}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              {!days.length && (
                <Empty
                  title="尚無飲食紀錄"
                  detail="開始記錄後即可查看每天營養素。"
                  href="/nutrition"
                  action="記錄一餐"
                />
              )}
            </Card>
          )}
          {path === "progress/training" && (
            <Card title="Training Performance" icon={Dumbbell}>
              <div className="notice">
                以下為所選日曆期間的實際紀錄，尚未套用 Cycle Muscle Volume
                Credit。
              </div>
              <div
                className="stats-grid"
                style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 20 }}
              >
                <div className="stat">
                  <small>Actual Working Sets</small>
                  <strong>
                    {sets.filter((s) => s.type === "working").length}
                  </strong>
                </div>
                <div className="stat">
                  <small>Volume Load（工作＋RP／Drop）</small>
                  <strong style={{ fontSize: 20 }}>
                    {round(
                      sets
                        .filter((s) => !["warmup", "rampup"].includes(s.type))
                        .reduce((a, s) => a + s.weight * s.reps, 0),
                    )}
                  </strong>
                  <small>kg × reps · 不同動作僅作原始總和</small>
                </div>
                <div className="stat">
                  <small>Muscle Volume Credit</small>
                  <strong>—</strong>
                  <small>計法待核定</small>
                </div>
              </div>
              {sessions.map((s) => (
                <div className="list-row" key={s.id}>
                  <div className="grow">
                    <h3>{s.name}</h3>
                    <p>{s.date}</p>
                  </div>
                  <span>{s.exercises.length} 個動作</span>
                </div>
              ))}
            </Card>
          )}
          {path === "progress/recovery" && (
            <div className="dashboard-grid">
              <Card title="記錄恢復" icon={Sun}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const d = new FormData(e.currentTarget);
                    if (
                      save("新增恢復紀錄", (s) =>
                        s.recoveries.push({
                          id: id(),
                          date: String(d.get("date")),
                          sleep: Number(d.get("sleep")),
                          fatigue: Number(d.get("fatigue")),
                          soreness: Number(d.get("soreness")),
                          stress: Number(d.get("stress")),
                          note: String(d.get("note") || ""),
                          createdAt: now(),
                        }),
                      )
                    )
                      notify();
                  }}
                >
                  <div className="form-grid">
                    <Field label="日期">
                      <input
                        type="date"
                        name="date"
                        defaultValue={date}
                        max={date}
                        required
                      />
                    </Field>
                    <NumberField
                      label="昨晚睡眠 小時"
                      name="sleep"
                      max={24}
                      step="0.5"
                    />
                    {[
                      ["fatigue", "疲勞"],
                      ["soreness", "痠痛"],
                      ["stress", "壓力"],
                    ].map(([n, l]) => (
                      <Field key={n} label={`${l}（1 低 → 5 高）`}>
                        <select name={n}>
                          {[1, 2, 3, 4, 5].map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      </Field>
                    ))}
                    <div className="full">
                      <Field label="補充感受（選填）">
                        <textarea name="note" maxLength={600} />
                      </Field>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button className="button">保存今日狀態</button>
                  </div>
                </form>
              </Card>
              <Card title="恢復紀錄">
                {recovery.length ? (
                  recovery
                    .slice()
                    .reverse()
                    .map((r) => (
                      <div key={r.id} className="list-row">
                        <div className="grow">
                          <h3>
                            {r.date} · 睡眠 {r.sleep}h
                          </h3>
                          <p>
                            疲勞 {r.fatigue} / 痠痛 {r.soreness} / 壓力{" "}
                            {r.stress}
                          </p>
                          {r.note && <p>{r.note}</p>}
                        </div>
                      </div>
                    ))
                ) : (
                  <Empty title="尚未紀錄" detail="沒有紀錄不等於已完全恢復。" />
                )}
              </Card>
            </div>
          )}
          {path === "progress/weekly" && (
            <div className="stack">
              <Card title="這七天的回顧" icon={ClipboardList}>
                <p className="muted">
                  Weekly Review 與 CUT
                  調整使用不同時間尺度。上方可檢查紀錄完整度；CUT 按原試算表每
                  10 天檢查一次。
                </p>
                <div className="divider" />
                <p>
                  本週資料：
                  {
                    state.days.filter(
                      (d) =>
                        d.date >= addDays(date, -6) &&
                        d.date <= date &&
                        d.complete,
                    ).length
                  }{" "}
                  天完整飲食紀錄、
                  {
                    measurements.filter(
                      (m) => m.date >= addDays(date, -6) && m.date <= date,
                    ).length
                  }{" "}
                  次實測體重。
                </p>
                <div className="form-actions">
                  <Link className="button secondary" href="/progress/review">
                    查看 CUT 規則結果
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </Card>
              <div className="notice">
                資料不足時保留現行計畫。GAIN、訓練 Progression 與 Pain Safety
                的正式規則仍待核定。
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

function WeightChart({
  points,
}: {
  points: { date: string; weight: number }[];
}) {
  const min = Math.min(...points.map((p) => p.weight)) - 1,
    max = Math.max(...points.map((p) => p.weight)) + 1;
  const duration = Math.max(
    1,
    daysBetween(points[0].date, points.at(-1)!.date),
  );
  const xy = points.map((p) => ({
    x: 20 + (daysBetween(points[0].date, p.date) / duration) * 480,
    y: 140 - ((p.weight - min) / (max - min)) * 115,
  }));
  return (
    <svg
      className="chart"
      viewBox="0 0 520 165"
      role="img"
      aria-label={`體重由 ${points[0].weight} 變為 ${points.at(-1)!.weight} 公斤`}
    >
      <line x1="20" y1="140" x2="500" y2="140" stroke="#e3e7da" />
      <line
        x1="20"
        y1="80"
        x2="500"
        y2="80"
        stroke="#e3e7da"
        strokeDasharray="3 6"
      />
      <polyline
        fill="none"
        stroke="#91a078"
        strokeWidth="2.5"
        points={xy.map((p) => `${p.x},${p.y}`).join(" ")}
      />
      {xy.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#a79560" />
          <text
            x={p.x}
            y={p.y - 12}
            textAnchor="middle"
            fontSize="11"
            fill="#858c79"
          >
            {points[i].weight}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function Recommendations({
  date,
  notify,
}: {
  date: string;
  notify: (m?: string) => void;
}) {
  const { state, save } = useStore();
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<{
    rec: Recommendation;
    delta: number;
  } | null>(null);
  const [activityAcknowledged, setActivityAcknowledged] = useState(false);
  const plan = activePlan(state, date);
  const baseDate = plan?.effectiveDate ?? date;
  const periods = Math.max(0, Math.floor(daysBetween(baseDate, date) / 10));
  const [period, setPeriod] = useState(Math.max(1, periods));
  const start = addDays(baseDate, (period - 1) * 10),
    end = addDays(baseDate, period * 10);
  function evaluate() {
    setMessage("");
    if (!plan || !state.profile?.eligible || state.profile.goal !== "CUT") {
      setMessage("請先建立符合入口條件的 CUT 計畫。");
      return;
    }
    if (end > date) {
      setMessage(`尚未到 ${end}，保留目前計畫。`);
      return;
    }
    const ms = visibleMeasurements(state);
    const a = ms.find((m) => m.date === start),
      b = ms.find((m) => m.date === end);
    if (!a || !b) {
      setMessage(
        `需要 ${start} 與 ${end} 的實測體重。請到 Body 補登，系統不使用沿用值代替。`,
      );
      return;
    }
    const result = cutReview(
      plan.inputs,
      start === state.versions[0].effectiveDate,
      a.weight,
      b.weight,
    );
    if (!result.direction) {
      setMessage(`依原表判斷，本期減重 ${result.loss} kg，無需調整。`);
      return;
    }
    const duplicate = state.recommendations.find(
      (r) =>
        r.baseVersionId === plan.id &&
        r.periodStart === start &&
        r.periodEnd === end &&
        r.startWeight === a.weight &&
        r.endWeight === b.weight,
    );
    if (duplicate) {
      setMessage(
        `這個期間已評估，狀態：${{ pending: "待決定", kept: "已保留原設定", accepted: "已採用", expired: "已失效" }[duplicate.status]}。`,
      );
      return;
    }
    if (
      save("建立 CUT 原表規則建議", (s) => {
        s.recommendations
          .filter((r) => r.status === "pending")
          .forEach((r) => {
            r.status = "expired";
          });
        s.recommendations.push({
          id: id(),
          baseVersionId: plan.id,
          createdAt: now(),
          periodStart: start,
          periodEnd: end,
          startWeight: a.weight,
          endWeight: b.weight,
          loss: result.loss,
          direction: result.direction!,
          range: result.range!,
          ruleId: RULE_ID,
          status: "pending",
        });
      })
    ) {
      notify("已產生一項主要建議");
    }
  }
  return (
    <div className="stack">
      <Card title="CUT · 10 天評估" icon={SlidersHorizontal}>
        <div className="notice">
          依 Numbers 實際公式 C32／C33 判斷。第一版只調碳水；未加入原表沒有的
          BMI 換算或額外安全下限。所有結果需由你檢視後決定。
        </div>
        <div className="toolbar" style={{ marginTop: 20 }}>
          <Field label="評估期間">
            <select
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
            >
              {Array.from({ length: Math.max(1, periods) }, (_, i) => (
                <option key={i} value={i + 1}>
                  {addDays(baseDate, i * 10)} →{" "}
                  {addDays(baseDate, (i + 1) * 10)}
                </option>
              ))}
            </select>
          </Field>
          <button className="button" onClick={evaluate} disabled={!plan}>
            檢查原表規則
            <ArrowRight size={14} />
          </button>
        </div>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
      </Card>
      {state.recommendations
        .slice()
        .reverse()
        .map((rec) => (
          <Card
            key={rec.id}
            title={
              rec.direction === "increase"
                ? "提高碳水攝取的建議"
                : "降低碳水攝取的建議"
            }
            kicker={`${rec.periodStart} — ${rec.periodEnd}`}
          >
            <span className="tag">
              {
                {
                  pending: "待你決定",
                  accepted: "已採用",
                  kept: "保留原設定",
                  expired: "已失效",
                }[rec.status]
              }
            </span>
            <p style={{ marginTop: 15 }}>
              實測 {rec.startWeight} → {rec.endWeight} kg，本期減重 {rec.loss}{" "}
              kg。
            </p>
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              原表規則建議{rec.direction === "increase" ? "增加" : "減少"}碳水{" "}
              {rec.range[0]}–{rec.range[1]} g。蛋白質與脂肪保持不變。
            </p>
            <p className="muted" style={{ fontSize: 10, marginTop: 8 }}>
              Rule: {rec.ruleId} · 基於當時的計畫與測量快照
            </p>
            {rec.status === "pending" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setActivityAcknowledged(false);
                  setPreview({
                    rec,
                    delta: Number(new FormData(e.currentTarget).get("delta")),
                  });
                }}
              >
                <div className="form-actions">
                  <NumberField
                    label="選擇調整克數"
                    name="delta"
                    min={rec.range[0]}
                    max={rec.range[1]}
                    value={rec.range[0]}
                    step="1"
                  />
                  <button className="button" type="submit">
                    預覽調整
                  </button>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => {
                      if (
                        save("Keep 建議", (s) =>
                          decide(s, rec.id, "kept", 0, date, id(), now()),
                        )
                      )
                        notify("已保留原設定");
                    }}
                  >
                    Keep · 保留
                  </button>
                </div>
              </form>
            )}
          </Card>
        ))}
      {preview && (
        <Card title="確認後，隔日生效" icon={History}>
          {activityEvidenceForReview(state, preview.rec.periodEnd)
            .significant && (
            <div className="activity-review-hold">
              <strong>活動量有明顯變化，建議先觀察</strong>
              <p>
                前七天平均{" "}
                {activityEvidenceForReview(
                  state,
                  preview.rec.periodEnd,
                ).previousAverage?.toLocaleString("en-US")}{" "}
                步； 最近七天{" "}
                {activityEvidenceForReview(
                  state,
                  preview.rec.periodEnd,
                ).recentAverage?.toLocaleString("en-US")}{" "}
                步。 步數變化不能直接換算為熱量。
              </p>
              <label className="check">
                <input
                  type="checkbox"
                  checked={activityAcknowledged}
                  onChange={(e) => setActivityAcknowledged(e.target.checked)}
                />
                我已確認活動變化，仍希望依原始 CUT 規則調整
              </label>
            </div>
          )}
          <p>
            各日型碳水均{preview.rec.direction === "increase" ? "增加" : "減少"}{" "}
            {preview.delta} g，P／F
            不變。這次改變是每日克數，不再乘一次日型倍率。
          </p>
          {plan && (
            <div className="table-wrap" style={{ marginTop: 15 }}>
              <table>
                <thead>
                  <tr>
                    <th>日型</th>
                    <th>目前 C</th>
                    <th>採用後 C</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(dayNames) as DayType[]).map((d) => (
                    <tr key={d}>
                      <td>{dayNames[d]}</td>
                      <td>{plan.targets[d].c} g</td>
                      <td>
                        {round(
                          plan.targets[d].c +
                            (preview.rec.direction === "increase"
                              ? preview.delta
                              : -preview.delta),
                        )}{" "}
                        g
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="form-actions">
            <button
              className="button"
              disabled={
                activityEvidenceForReview(state, preview.rec.periodEnd)
                  .significant && !activityAcknowledged
              }
              onClick={() => {
                if (
                  save("Accept 建議並建立新版本", (s) =>
                    decide(
                      s,
                      preview.rec.id,
                      "accepted",
                      preview.delta,
                      date,
                      id(),
                      now(),
                      activityAcknowledged,
                    ),
                  )
                ) {
                  setPreview(null);
                  notify("已建立新版本，隔日生效");
                }
              }}
            >
              Accept · 確認採用
            </button>
            <button
              className="button secondary"
              onClick={() => setPreview(null)}
            >
              返回
            </button>
          </div>
        </Card>
      )}
      {!state.recommendations.length && (
        <Card>
          <Empty
            title="尚無建議"
            detail="到評估日後，使用真實紀錄檢查是否需要調整。"
            href="/progress/body"
            action="記錄體重"
          />
        </Card>
      )}
    </div>
  );
}
