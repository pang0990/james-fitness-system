import {
  activePlan,
  addDays,
  daysBetween,
  mealTotals,
  round,
  visibleMeasurements,
  type AppState,
  type Macros,
} from "./domain";
import { performance, scheduleKind } from "./training-model";
import { GAIN_TEMP_RULE } from "./onboarding";
export const GAIN_RULE = "james-gain-v1.0";
export type GainSettings = {
  level: "beginner" | "intermediate" | "advanced";
  proteinFatConfirmed: boolean;
  startCarbsConfirmed: boolean;
  adherenceConfirmed: boolean;
  recoveryConfirmed: boolean;
};
export type GainDecision = {
  id: string;
  createdAt: string;
  periodStart: string;
  periodEnd: string;
  ruleId: string;
  baseVersionId: string | null;
  kind: string;
  reason: string;
  delta: number;
  baseline: Macros;
  status: "accepted" | "kept";
  versionId?: string;
};
export const gainRanges = {
  beginner: [0.25, 0.5],
  intermediate: [0.2, 0.35],
  advanced: [0.1, 0.25],
} as const;
export function gainReview(state: AppState, date: string) {
  const start = addDays(date, -13),
    middle = addDays(date, -6);
  const weights = visibleMeasurements(state).filter(
    (w) => w.date >= start && w.date <= date,
  );
  const a = weights.filter((w) => w.date < middle),
    b = weights.filter((w) => w.date >= middle);
  const avg = (items: typeof weights) =>
    items.reduce((n, w) => n + w.weight, 0) / items.length;
  const weekA = a.length ? avg(a) : null,
    weekB = b.length ? avg(b) : null;
  const rate = weekA && weekB ? ((weekB - weekA) / weekA) * 100 : null;
  const complete = state.days.filter(
    (d) => d.date >= start && d.date <= date && d.complete,
  );
  const baseline = Object.fromEntries(
    ["p", "c", "f", "kcal"].map((k) => [
      k,
      complete.length
        ? round(
            complete.reduce(
              (n, d) => n + mealTotals(state, d.date)[k as keyof Macros],
              0,
            ) / complete.length,
          )
        : 0,
    ]),
  ) as Macros;
  const currentPlan = activePlan(state, date);
  const plan = currentPlan?.inputs.goal === "GAIN" ? currentPlan : null;
  const isTemporary = plan?.ruleId === GAIN_TEMP_RULE;
  const settings = state.gainSettings;
  const range = settings ? gainRanges[settings.level] : null;
  const sessions = state.sessions.filter(
    (s) => s.status === "completed" && s.date >= start && s.date <= date,
  );
  const results = performance({ ...state, sessions }).filter(
    (p) => p.comparable,
  );
  const hasSchedule = Boolean(state.weeklySchedule?.length ||
    state.schedule?.some(r => r.kind === "train" && !r.cleared));
  const scheduled = hasSchedule
    ? Array.from({length:14},(_,i)=>addDays(start,i)).filter(d=>scheduleKind(state,d)==="train")
    : [];
  const completedDates = new Set(sessions.filter(s=>!s.isExtra).map(s=>s.workoutDate ?? s.date));
  const trainingRate = scheduled.length
    ? scheduled.filter(d=>completedDates.has(d)).length/scheduled.length
    : null;
  const recentPainHold = state.recoveryEntries?.some(r =>
    r.type === "pain" && r.value > 5 && r.date >= addDays(date,-3) && r.date <= date) ?? false;
  let reason = "",
    kind = "observe",
    delta = 0;
  if (!state.profile?.eligible || state.profile.goal !== "GAIN")
    reason = "先完成 GAIN 個人資料與適用狀態。";
  else if (state.versions.some((v) => v.effectiveDate > date))
    reason = "已有待生效版本，先觀察新計畫。";
  else if (
    state.gainDecisions?.some((d) => daysBetween(d.periodEnd, date) < 14)
  )
    reason = "本次決定後先累積 14 天新資料，再次評估。";
  else if (isTemporary) {
    if (daysBetween(plan!.effectiveDate, date) < 13)
      reason = "Temporary GAIN 尚在最初 14 天觀察期間，不提前調整。";
    else if (recentPainHold)
      reason = "近期有需要優先處理的疼痛安全警示，暫緩營養調整。";
    else if (a.length < 5 || b.length < 5 || complete.length < 10 || sessions.length < 4)
      reason = "暫時目標尚需兩週各至少 5 天體重、10 天完整飲食及 4 次阻力訓練。";
    else if (trainingRate === null || trainingRate < 0.75)
      reason = "需要可核對的訓練排程與至少 75% 完成率，才可從 Temporary 建立正式基準。";
    else {
      kind = "temporary-baseline";
      delta = 0;
      reason = "已達到 14 天最低資料門檻：建議以實際完整飲食紀錄平均值建立個人 GAIN 基準；僅在 Accept 後隔日生效。";
    }
  }
  else if (!settings) reason = "先選擇訓練程度與確認基準條件。";
  else if (plan && daysBetween(plan.effectiveDate, date) < 7)
    reason = "Observation · 新計畫第一週不再次調整。";
  else if (plan && daysBetween(plan.effectiveDate, date) < 13)
    reason = "先累積目前計畫的兩個完整七天區間。";
  else if (daysBetween(visibleMeasurements(state)[0]?.date ?? date, date) < 13)
    reason = "Baseline 至少需要 14 個日曆日，持續記錄。";
  else if (
    a.length < 5 ||
    b.length < 5 ||
    complete.length < 10 ||
    !sessions.length ||
    rate === null
  )
    reason =
      "資料不足：兩週各至少 5 天體重、合計至少 10 天完整飲食，以及訓練紀錄。";
  else if (!settings.proteinFatConfirmed)
    reason = "先確認蛋白質與脂肪已足夠，再調整碳水。";
  else if (!plan) {
    if (rate < -0.25) {
      kind = "baseline-correction";
      delta = 25;
      reason =
        "目前體重仍下降，先以 +25 g 碳水修正基準，不將目前攝取稱為維持飲食。";
    } else if (rate > 0.25) {
      kind = "baseline";
      reason = "目前已有增重趨勢，先以實際攝取建立基準，不額外增加碳水。";
    } else if (results.some((p) => p.improved)) {
      kind = "baseline";
      reason = "體重穩定且訓練仍進步，先保留實際攝取。";
    } else if (!settings.startCarbsConfirmed) {
      reason = "基準穩定；先確認碳水接近 3 g/kg，才採用 James 起始 +1 g/kg。";
    } else {
      kind = "gain-start";
      delta = round(weekB!);
      reason = "基準在 ±0.25% 內，經確認符合 James 起始條件；碳水增加 1 g/kg。";
    }
  } else if (rate < range![0]) {
    if (results.some((p) => p.improved))
      reason = "體重低於目標但訓練仍進步，Keep Current。";
    else if (!results.length) reason = "缺少可比較的訓練表現，先保留計畫。";
    else if (!settings.adherenceConfirmed)
      reason = "先確認本期飲食執行穩定，完整紀錄不等於達成目標。";
    else if (!settings.recoveryConfirmed)
      reason = "先處理或確認恢復狀態，不直接增加食物。";
    else {
      kind = "adjust";
      delta = 25;
      reason =
        "體重低於目標、相同動作沒有進步，且本期執行與恢復已確認，建議 +25 g 碳水。";
    }
  } else if (rate > range![1]) {
    const prior = visibleMeasurements(state).filter(
      (w) => w.date >= addDays(start, -7) && w.date < start,
    );
    const prev = prior.length >= 5 ? avg(prior) : null;
    const prevRate = prev && weekA ? ((weekA - prev) / prev) * 100 : null;
    if (
      prevRate !== null &&
      prevRate > range![1] &&
      daysBetween(plan.effectiveDate, date) >= 20
    ) {
      kind = "adjust";
      delta = -25;
      reason = "連續兩週增重高於目標，建議碳水 -25 g。";
    } else reason = "本期高於目標，先觀察；需兩次完整週平均變化才考慮下調。";
  } else reason = "增重速度在設定範圍內，Keep Current。";
  return {
    start,
    end: date,
    weekA,
    weekB,
    rate,
    complete: complete.length,
    weights: weights.length,
    baseline,
    range,
    kind,
    delta,
    reason,
    planId: plan?.id ?? null,
    actionable: kind !== "observe",
  };
}
export function applyGainDecision(
  state: AppState,
  date: string,
  accept: boolean,
  expected: string,
) {
  const review = gainReview(state, date);
  if (JSON.stringify(review) !== expected)
    throw Error("資料已更新，請重新查看建議。");
  if (!review.actionable) throw Error("目前沒有可套用的調整。");
  const id = crypto.randomUUID(),
    createdAt = new Date().toISOString();
  let versionId: string | undefined;
  if (accept) {
    const previousPlan = activePlan(state, date);
    const plan = previousPlan?.inputs.goal === "GAIN" ? previousPlan : null;
    versionId = crypto.randomUUID();
    const base = plan && plan.ruleId !== GAIN_TEMP_RULE ? plan.targets : {
      training: review.baseline,
      light: review.baseline,
      rest: review.baseline,
    };
    const targets = Object.fromEntries(
      Object.entries(base).map(([day, m]) => {
        const c = round(m.c + review.delta);
        if (c < 0) throw Error("碳水不可低於零");
        return [day, { ...m, c, kcal: round(m.kcal + review.delta * 4) }];
      }),
    ) as typeof base;
    state.versions.push({
      id: versionId,
      number: state.versions.length + 1,
      createdAt,
      effectiveDate: addDays(date, 1),
      previousId: previousPlan?.id ?? null,
      ruleId: GAIN_RULE,
      inputs: structuredClone(state.profile!),
      targets,
      reason: review.reason,
    });
  }
  (state.gainDecisions ??= []).push({
    id,
    createdAt,
    periodStart: review.start,
    periodEnd: review.end,
    ruleId: GAIN_RULE,
    baseVersionId: review.planId,
    kind: review.kind,
    reason: review.reason,
    delta: review.delta,
    baseline: review.baseline,
    status: accept ? "accepted" : "kept",
    versionId,
  });
  if (state.gainSettings) {
    state.gainSettings.adherenceConfirmed = false;
    state.gainSettings.recoveryConfirmed = false;
  }
}
