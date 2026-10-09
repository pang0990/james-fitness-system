import { z } from "zod";

export const RULE_ID = "numbers-3.0-7b135702";
export const sourceHash =
  "7b1357023028693b48f03c4008329a98355ebe1f64f6cd983505ed2c627626e5";
export const frequencies = [
  "2-3小時／2次",
  "4-5小時／3次",
  "6-7小時／4次",
  "8-9小時／5次",
] as const;
export const dayNames = {
  training: "訓練日",
  light: "有氧／輕訓日",
  rest: "休息日",
} as const;
export type DayType = keyof typeof dayNames;
export type Macros = { p: number; c: number; f: number; kcal: number };
export type Profile = {
  name: string;
  age: number;
  height: number;
  weight: number;
  sex: "male" | "female";
  frequency: number;
  experiencedCut: boolean;
  goal: "CUT" | "GAIN";
  eligible: boolean;
  timezone: string;
  waterTarget: number;
};
export const profileSchema = z.object({
  name: z.string().trim().min(1).max(40),
  age: z.number().int().min(18).max(100),
  height: z.number().min(100).max(250),
  weight: z.number().min(30).max(350),
  sex: z.enum(["male", "female"]),
  frequency: z.number().int().min(0).max(3),
  experiencedCut: z.boolean(),
  goal: z.enum(["CUT", "GAIN"]),
  eligible: z.boolean(),
  timezone: z.string().min(1),
  waterTarget: z.number().int().min(0).max(10000),
});
export const round = (n: number, places = 1) =>
  Math.round((n + Number.EPSILON) * 10 ** places) / 10 ** places;
export function cutTargets(profile: Profile): Record<DayType, Macros> {
  profileSchema.parse(profile);
  const i = profile.frequency;
  const c = round(
    profile.weight *
      (profile.sex === "male" ? [2.2, 2.5, 3, 3.5] : [2, 2.2, 2.5, 3])[i],
  );
  const p = round(profile.weight * [1.4, 1.6, 1.7, 1.8][i]);
  const f = round(
    profile.weight *
      (profile.sex === "male" ? [0.8, 0.9, 1, 1] : [1, 1.1, 1.1, 1.2])[i],
  );
  return Object.fromEntries(
    Object.entries({ training: 1, light: 0.7, rest: 0.5 }).map(([day, m]) => {
      const carbs = round(c * m);
      return [
        day,
        {
          p,
          c: carbs,
          f,
          kcal: Math.round(p * 4) + Math.round(carbs * 4) + Math.round(f * 9),
        },
      ];
    }),
  ) as Record<DayType, Macros>;
}
export function dateInZone(timezone = "Asia/Taipei", date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function addDays(date: string, n: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function daysBetween(a: string, b: string) {
  return Math.round(
    (Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000,
  );
}
export type PlanVersion = {
  id: string;
  number: number;
  createdAt: string;
  effectiveDate: string;
  previousId: string | null;
  ruleId: string;
  inputs: Profile;
  targets: Record<DayType, Macros>;
  reason: string;
};
export type Food = {
  nameEn?: string;
  id: string;
  name: string;
  category: string;
  base: number;
  unit: string;
  p: number;
  c: number;
  f: number;
  kcal: number;
  source: string;
  version: number;
  note?: string;
};
export type Meal = Macros & {
  id: string;
  date: string;
  slot: string;
  name: string;
  quantity: number;
  unit: string;
  foodId?: string;
  foodVersion?: number;
  createdAt: string;
  supersedes?: string;
  deleted?: boolean;
};
export type Water = {
  id: string;
  date: string;
  ml: number;
  createdAt: string;
  reverses?: string;
};
export type Measurement = {
  id: string;
  date: string;
  weight: number;
  createdAt: string;
  supersedes?: string;
};
export type Recovery = {
  id: string;
  date: string;
  sleep: number;
  fatigue: number;
  soreness: number;
  stress: number;
  note: string;
  createdAt: string;
};
export type Segment = {
  id: string;
  weight: number;
  reps: number;
  rir: number | null;
  type: "working" | "warmup" | "rampup" | "rp" | "drop";
  parentId?: string;
  createdAt: string;
};
export type Session = {
  cycleId?: string;
  cycleDayIndex?: number;
  phase?: "warmup" | "workout";
  id: string;
  date: string;
  name: string;
  status: "in_progress" | "completed";
  exercises: { id: string; name: string; sets: Segment[] }[];
  createdAt: string;
  completedAt?: string;
  feedback?: string;
};
export type Recommendation = {
  id: string;
  baseVersionId: string;
  createdAt: string;
  periodStart: string;
  periodEnd: string;
  startWeight: number;
  endWeight: number;
  loss: number;
  direction: "increase" | "decrease";
  range: [number, number];
  ruleId: string;
  status: "pending" | "accepted" | "kept" | "expired";
  decisionAt?: string;
  newVersionId?: string;
};
export type NutritionDay = {
  date: string;
  dayType: DayType;
  versionId: string | null;
  target: Macros | null;
  complete: boolean;
};
export type Cycle = {
  id: string;
  name: string;
  days: { name: string }[];
  createdAt: string;
};
export type CycleEvent = {
  id: string;
  cycleId: string;
  type: "completed" | "skipped";
  date: string;
  sessionId?: string;
};
export type AppState = {
  cycles?: Cycle[];
  cycleEvents?: CycleEvent[];
  schemaVersion: 1;
  revision: number;
  profile: Profile | null;
  versions: PlanVersion[];
  days: NutritionDay[];
  meals: Meal[];
  waters: Water[];
  measurements: Measurement[];
  recoveries: Recovery[];
  foods: Food[];
  mealSlots: string[];
  sessions: Session[];
  recommendations: Recommendation[];
  cardio: {
    id: string;
    date: string;
    type: string;
    minutes: number;
    calories: number | null;
    createdAt: string;
  }[];
  audit: { id: string; at: string; action: string }[];
};
export const initialState = (): AppState => ({
  schemaVersion: 1,
  cycles: [],
  cycleEvents: [],
  revision: 0,
  profile: null,
  versions: [],
  days: [],
  meals: [],
  waters: [],
  measurements: [],
  recoveries: [],
  foods: [],
  mealSlots: ["早餐", "午餐", "晚餐", "點心"],
  sessions: [],
  recommendations: [],
  cardio: [],
  audit: [],
});
export function activePlan(state: AppState, date: string) {
  return (
    state.versions
      .filter((v) => v.effectiveDate <= date)
      .sort(
        (a, b) =>
          b.effectiveDate.localeCompare(a.effectiveDate) || b.number - a.number,
      )[0] ?? null
  );
}
export function visibleMeals(state: AppState, date?: string) {
  const replaced = new Set(
    state.meals.map((m) => m.supersedes).filter(Boolean),
  );
  return state.meals.filter(
    (m) => !replaced.has(m.id) && !m.deleted && (!date || m.date === date),
  );
}
export function visibleMeasurements(state: AppState) {
  const replaced = new Set(
    state.measurements.map((m) => m.supersedes).filter(Boolean),
  );
  return state.measurements
    .filter((m) => !replaced.has(m.id))
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function mealTotals(state: AppState, date: string): Macros {
  return visibleMeals(state, date).reduce(
    (a, m) => ({
      p: round(a.p + m.p),
      c: round(a.c + m.c),
      f: round(a.f + m.f),
      kcal: round(a.kcal + m.kcal),
    }),
    { p: 0, c: 0, f: 0, kcal: 0 },
  );
}
export function waterTotal(state: AppState, date: string) {
  return state.waters
    .filter((w) => w.date === date)
    .reduce((a, w) => a + w.ml, 0);
}
export function resolveDay(state: AppState, date: string): NutritionDay {
  const saved = state.days.find((d) => d.date === date);
  if (saved) {
    const plan=activePlan(state,date);
    return !saved.versionId&&plan?{...saved,versionId:plan.id,target:plan.targets[saved.dayType]}:saved;
  }
  const v = activePlan(state, date);
  return {
    date,
    dayType: "training",
    versionId: v?.id ?? null,
    target: v?.targets.training ?? null,
    complete: false,
  };
}
export function setDayType(state: AppState, date: string, type: DayType) {
  const day = resolveDay(state, date);
  const version =
    state.versions.find((v) => v.id === day.versionId) ??
    activePlan(state, date);
  const next = {
    ...day,
    dayType: type,
    versionId: version?.id ?? null,
    target: version?.targets[type] ?? null,
  };
  state.days = [...state.days.filter((d) => d.date !== date), next];
}
export function pinDay(state: AppState, date: string) {
  if (!state.days.some((d) => d.date === date))
    state.days.push(resolveDay(state, date));
}
export function createInitialPlan(
  state: AppState,
  date: string,
  id: string,
  now: string,
) {
  if (!state.profile) throw Error("請先完成個人資料");
  if (state.versions.length) throw Error("初始計畫已存在");
  if (state.profile.goal !== "CUT" || !state.profile.eligible)
    throw Error("目前僅能建立符合入口條件的 CUT 計畫");
  state.versions.push({
    id,
    number: 1,
    createdAt: now,
    effectiveDate: date,
    previousId: null,
    ruleId: RULE_ID,
    inputs: { ...state.profile },
    targets: cutTargets(state.profile),
    reason: "使用者確認 Numbers 3.0 初始計畫",
  });
  const day = state.days.find((d) => d.date === date && !d.versionId);
  if (day) {
    day.versionId = id;
    day.target = structuredClone(state.versions.at(-1)!.targets[day.dayType]);
  }
}
// Exact decision boundaries from Numbers 90天追踪::C32/C33. Reference-table prose differs.
export function cutReview(
  profile: Profile,
  firstPeriod: boolean,
  startWeight: number,
  endWeight: number,
) {
  const loss = round(startWeight - endWeight);
  const upper = profile.experiencedCut
    ? firstPeriod
      ? 2
      : 1.5
    : firstPeriod
      ? 1.5
      : 1.2;
  const lower = profile.experiencedCut ? 0.3 : 0.2;
  const correction = [-2, 0, 3, 5][profile.frequency];
  const base = profile.sex === "male" ? [20, 30] : [15, 25];
  if (loss > upper)
    return {
      loss,
      direction: "increase" as const,
      range: [base[0] + correction, base[1] + correction] as [number, number],
    };
  if (loss < lower)
    return {
      loss,
      direction: "decrease" as const,
      range: [base[0] - correction, base[1] - correction] as [number, number],
    };
  return { loss, direction: null, range: null };
}
export function decide(
  state: AppState,
  id: string,
  choice: "accepted" | "kept",
  delta: number,
  date: string,
  newId: string,
  now: string,
) {
  const rec = state.recommendations.find((r) => r.id === id);
  if (!rec) throw Error("找不到建議");
  if (rec.status !== "pending") return;
  if (choice === "kept") {
    rec.status = "kept";
    rec.decisionAt = now;
    return;
  }
  if (!state.profile?.eligible || state.profile.goal !== "CUT")
    throw Error("目前為紀錄模式，不採用自動營養調整");
  const current = activePlan(state, date);
  if (
    !current ||
    current.id !== rec.baseVersionId ||
    state.versions.some((v) => v.effectiveDate > date)
  )
    throw Error("計畫已變更，請重新評估");
  const measurements = visibleMeasurements(state);
  if (
    measurements.find((m) => m.date === rec.periodStart)?.weight !==
      rec.startWeight ||
    measurements.find((m) => m.date === rec.periodEnd)?.weight !== rec.endWeight
  )
    throw Error("體重資料已修正，請重新評估");
  if (!Number.isFinite(delta) || delta < rec.range[0] || delta > rec.range[1])
    throw Error("請選擇建議範圍內的克數");
  const change = rec.direction === "increase" ? delta : -delta;
  const targets = structuredClone(current.targets);
  // Explicit daily gram adjustment; never silently multiply an accepted gram change by day type.
  for (const key of Object.keys(targets) as DayType[]) {
    targets[key].c = round(targets[key].c + change);
    if (targets[key].c < 0) throw Error("調整後碳水不可為負值");
    targets[key].kcal =
      Math.round(targets[key].p * 4) +
      Math.round(targets[key].c * 4) +
      Math.round(targets[key].f * 9);
  }
  const version: PlanVersion = {
    ...structuredClone(current),
    id: newId,
    number: Math.max(...state.versions.map((v) => v.number)) + 1,
    createdAt: now,
    effectiveDate: addDays(date, 1),
    previousId: current.id,
    targets,
    reason: `採用 ${rec.periodStart} 至 ${rec.periodEnd} 的建議：各日型碳水 ${change > 0 ? "+" : ""}${change} g`,
  };
  state.versions.push(version);
  rec.status = "accepted";
  rec.decisionAt = now;
  rec.newVersionId = newId;
}
export function validateState(value: unknown): AppState {
  if (!value || typeof value !== "object") throw Error("資料格式無效");
  const s = value as AppState;
  if (s.schemaVersion !== 1 || !Number.isInteger(s.revision) || s.revision < 0)
    throw Error("不支援的資料版本");
  for (const key of [
    "versions",
    "days",
    "meals",
    "waters",
    "measurements",
    "recoveries",
    "foods",
    "mealSlots",
    "sessions",
    "recommendations",
    "cardio",
    "audit",
  ] as const)
    if (!Array.isArray(s[key])) throw Error("資料不完整");
  if (s.profile) profileSchema.parse(s.profile);
  const numeric = (n: unknown) => typeof n === "number" && Number.isFinite(n);
  for (const meal of s.meals)
    if (
      !["p", "c", "f", "kcal"].every(
        (k) => numeric(meal[k as keyof Macros]) && meal[k as keyof Macros] >= 0,
      )
    )
      throw Error("飲食資料無效");
  return s;
}
