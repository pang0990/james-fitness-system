import {
  type AppState,
  type Food,
  type Meal,
  pinDay,
  round,
  syncMealCompletion,
  visibleMeals,
} from "./domain";
import { validateNewMealInput, validateMealDate } from "./nutrition-input";

export type MealSnapshot = Pick<
  Meal,
  | "name"
  | "quantity"
  | "unit"
  | "foodId"
  | "foodVersion"
  | "p"
  | "c"
  | "f"
  | "kcal"
>;
export type PlateItem = {
  id: string;
  snapshot: MealSnapshot;
  quantity: number;
};
export function foodSnapshot(food: Food): MealSnapshot {
  return {
    name: food.name,
    quantity: food.base,
    unit: food.unit,
    foodId: food.id,
    foodVersion: food.version,
    p: food.p,
    c: food.c,
    f: food.f,
    kcal: food.kcal,
  };
}
export function mealSnapshot(meal: MealSnapshot): MealSnapshot {
  const { name, quantity, unit, foodId, foodVersion, p, c, f, kcal } = meal;
  return { name, quantity, unit, foodId, foodVersion, p, c, f, kcal };
}
export function portion(item: PlateItem): MealSnapshot {
  const base = item.snapshot;
  if (!Number.isFinite(base.quantity) || base.quantity <= 0)
    throw Error("原始份量無效，請重新確認食物");
  const factor = item.quantity / base.quantity;
  if (factor === 1) return { ...base }; // Exact copies retain original snapshot precision.
  return {
    ...base,
    quantity: item.quantity,
    p: round(base.p * factor),
    c: round(base.c * factor),
    f: round(base.f * factor),
    kcal: round(base.kcal * factor),
  };
}
export function commitPlate(
  state: AppState,
  items: PlateItem[],
  date: string,
  slot: string,
  at: string,
) {
  if (!items.length || new Set(items.map((x) => x.id)).size !== items.length)
    throw Error("請確認待加入食物");
  validateMealDate(date, state.profile?.timezone, new Date(at));
  const rows = items.map((item) => {
    if (!item.id) throw Error("食物識別無效");
    const snapshot = portion(item);
    return {
      ...snapshot,
      ...validateNewMealInput({ ...snapshot, slot }),
      id: item.id,
      date,
      createdAt: at,
    };
  });
  const existing = rows.filter((row) =>
    state.meals.some((m) => m.id === row.id),
  );
  if (existing.length === rows.length) return; // Same confirmed plate is retry-safe.
  if (existing.length)
    throw Error("此批紀錄不完整，請重新確認，未寫入其他項目");
  pinDay(state, date);
  state.meals.push(...rows);
  syncMealCompletion(state, date);
}
export function suggestedFoodIds(state: AppState, slot: string): string[] {
  const scores = new Map<string, { count: number; last: string }>();
  for (const m of visibleMeals(state).filter(
    (m) => m.slot === slot && m.foodId,
  )) {
    const old = scores.get(m.foodId!);
    scores.set(m.foodId!, {
      count: (old?.count ?? 0) + 1,
      last: old && old.last > m.createdAt ? old.last : m.createdAt,
    });
  }
  return [...scores]
    .sort(
      (a, b) => b[1].count - a[1].count || b[1].last.localeCompare(a[1].last),
    )
    .map(([id]) => id);
}
