import { type AppState, type RecoveryEntry } from "./domain";
export function recoveryEntries(state: AppState): RecoveryEntry[] {
  return [
    ...state.recoveries.flatMap((r) =>
      (["sleep", "fatigue", "stress", "soreness"] as const).map((type) => ({
        id: r.id + ":" + type,
        date: r.date,
        type,
        value: type === "sleep" ? Math.round(r.sleep * 60) : r[type],
        createdAt: r.createdAt,
        area: type === "soreness" ? "未分部位（舊紀錄）" : undefined,
        side: type === "soreness" ? "Both" : undefined,
      })),
    ),
    ...(state.recoveryEntries ?? []),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export function latestRecovery(state: AppState, date: string) {
  const map = new Map<string, RecoveryEntry>();
  for (const r of recoveryEntries(state).filter((r) => r.date === date))
    map.set([r.type, r.area ?? "", r.side ?? ""].join(":"), r);
  return [...map.values()];
}
export function painLevel(value: number, flags: string[]) {
  return flags.includes("red")
    ? 4
    : flags.includes("sharp") || flags.includes("worsening") || value > 5
      ? 3
      : value >= 3
        ? 2
        : 1;
}
export const safetyText: Record<number, string> = {
  1: "目前未記錄較高級別警訊；若不適惡化或動作異常，請停止並重新評估。",
  2: "降低負荷或改用無痛動作。若逐組惡化，停止該動作並重新評估。",
  3: "停止該動作；不要撐完。若無完全無痛的替代動作，結束相關訓練並尋求評估。",
  4: "停止整次訓練並尋求適當醫療評估；胸痛、昏厥或其他急性嚴重症狀，請立即尋求緊急醫療協助。",
};
