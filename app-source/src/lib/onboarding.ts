import { cutTargets, round, type DayType, type Macros, type Profile } from "./domain";

export const MIN_KCAL = { male: 1500, female: 1200 } as const;
export const GAIN_TEMP_RULE = "james-gain-temp-v1.0";
export type SafetySelection = {
  pregnantOrBreastfeeding: boolean;
  eatingDisorderHistory: boolean;
  chronicConditionOrMedication: boolean;
  otherMedicalConcern: boolean;
};
export const blankSafety = (): SafetySelection => ({
  pregnantOrBreastfeeding: false, eatingDisorderHistory: false,
  chronicConditionOrMedication: false, otherMedicalConcern: false,
});
export type OnboardingData = {
  name: string; age: number; height: number; weight: number;
  sex: "male" | "female"; bodyFat?: number;
  goal: "CUT" | "GAIN"; frequency: number; resistanceDays: number;
  experiencedCut: boolean;
  safety: SafetySelection;
};
export type StartingTarget = {
  status: "cut" | "gain-temporary" | "tracking";
  reason: string;
  targets: Record<DayType, Macros> | null;
  ruleId: string | null;
};

export const asProfile = (data: OnboardingData, existing?: Profile | null): Profile => ({
  name: data.name.trim() || "Athlete",
  age: data.age, height: data.height, weight: data.weight,
  sex: data.sex, frequency: data.frequency,
  experiencedCut: data.experiencedCut,
  goal: data.goal,
  eligible: data.age >= 18 && !Object.values(data.safety).some(Boolean) && !(data.goal === "CUT" && data.frequency < 0),
  timezone: existing?.timezone || "Asia/Taipei",
  waterTarget: existing?.waterTarget ?? 0,
  bodyFat: data.bodyFat,
  resistanceDays: data.resistanceDays,
  safety: data.safety,
});

export function startingTarget(data: OnboardingData): StartingTarget {
  const tracking = (reason: string): StartingTarget => ({
    status: "tracking", reason, targets: null, ruleId: null
  });
  if (!Number.isFinite(data.age) || !Number.isFinite(data.height) ||
      !Number.isFinite(data.weight) || data.age < 1 || data.age > 100 ||
      data.height < 100 || data.height > 250 || data.weight < 30 || data.weight > 350 ||
      (data.bodyFat !== undefined && (data.bodyFat < 1 || data.bodyFat > 70)))
    return tracking("基本資料不完整或超出可計算範圍，先修正資料。");
  if (data.age < 18) return tracking("未滿 18 歲目前僅提供紀錄，不提供標準減脂或增肌處方。");
  if (Object.values(data.safety).some(Boolean))
    return tracking("目前有需個別評估的安全情況，先以 Tracking Only 紀錄，不提供自動營養處方。");
  if (data.goal === "CUT") {
    if (!Number.isInteger(data.frequency) || data.frequency < 0 || data.frequency > 3)
      return tracking("無法判定 Numbers 3.0 運動級別；請依對應時長與頻率選擇。");
    const profile = asProfile(data);
    const targets = cutTargets(profile);
    if (Object.values(targets).some(target => target.kcal < MIN_KCAL[data.sex]))
      return tracking("休息日或其他日型熱量低於目前設定的安全參考下限，先記錄並尋求個別評估。");
    return { status: "cut", ruleId: "numbers-3.0-7b135702",
      targets, reason: "採 Numbers 3.0 原始係數，訓練／輕訓／休息日碳水倍率為 100%／70%／50%。" };
  }
  if (data.resistanceDays < 3)
    return tracking("GAIN 暫時目標只適用每週至少 3 次阻力訓練者；目前先收集個人資料。");
  const bmi = data.weight / ((data.height / 100) ** 2);
  if (data.bodyFat !== undefined) {
    if (data.bodyFat >= (data.sex === "male" ? 25 : 35))
      return tracking("目前體脂值達到 GAIN 暫時公式的排除條件，先收集個人資料。");
  } else if (bmi >= 30) {
    return tracking("尚無體脂值且 BMI ≥ 30，先收集個人資料，不自動產生 GAIN 暫時熱量。");
  }
  const p = round(data.weight * 1.8);
  const f = round(data.weight * 1.0);
  const kcal = round(data.weight * 42, 0);
  const c = round((kcal - p * 4 - f * 9) / 4);
  if (!Number.isFinite(c) || c < 3 * data.weight)
    return tracking("暫時碳水低於 3 g/kg 參考下限或計算異常，暫不自動產生目標。");
  const macros = { p, c, f, kcal };
  return {
    status: "gain-temporary", ruleId: GAIN_TEMP_RULE,
    targets: { training: macros, light: { ...macros }, rest: { ...macros } },
    reason: "GAIN Temporary 使用 42 kcal/kg；14 天後達到有效資料門檻才重新評估，只有 Accept 才建立下一版本。",
  };
}
