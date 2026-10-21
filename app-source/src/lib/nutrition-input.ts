/**
 * Validate one newly submitted meal without rewriting historical backups.
 * Limits are input safety bounds, not nutrition targets or CUT/GAIN rules.
 */
export type NewMealInput = {
  name: string;
  slot: string;
  quantity: number;
  p: number;
  c: number;
  f: number;
  kcal: number;
};
export function validateNewMealInput(input: NewMealInput): NewMealInput {
  const name = input.name.trim();
  const slot = input.slot.trim();
  if (!name || name.length > 80 || !slot || slot.length > 80)
    throw Error("請輸入有效的食物名稱及餐次");
  if (!Number.isFinite(input.quantity) || input.quantity <= 0 || input.quantity > 10000)
    throw Error("食物份量必須介於 0 與 10000 之間");
  for (const [label, value] of [
    ["蛋白質", input.p], ["碳水", input.c], ["脂肪", input.f],
  ] as const) {
    if (!Number.isFinite(value) || value < 0 || value > 1000)
      throw Error(label + "數值無效，單餐上限為 1000 g");
  }
  if (!Number.isFinite(input.kcal) || input.kcal < 0 || input.kcal > 10000)
    throw Error("熱量數值無效，請確認食物份量");
  return { ...input, name, slot };
}
