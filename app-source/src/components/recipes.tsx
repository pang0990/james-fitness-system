"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { pinDay, round } from "@/lib/domain";
import { PageTitle, Field, Sheet, NutritionSummary, uid, stamp } from "./daily";
import builtInRecipes from "@/content/recipes-seed.json";

type RecipeItem = {
  id: string; name: string; category: string;
  ingredients: string; steps: string;
  p: number | null; c: number | null; f: number | null; kcal: number | null;
  version?: number; nameEn?: string; notes?: string;
  servingLabel?: string; source?: string; sourceUrl?: string | null;
  nutritionVerified?: boolean;
};
type CompleteRecipe = RecipeItem & { p: number; c: number; f: number; kcal: number };
const complete = (r: RecipeItem): r is CompleteRecipe =>
  [r.p, r.c, r.f, r.kcal].every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0);
const value = (v: number | null) => v === null ? "未提供" : String(v);
const MULTIPLIER_NOTE = "食材表保留原始食譜份量。調整份數只會按比例換算營養素；食材數量目前為非結構化文字，請依份數自行調整，不能假裝已自動換算。";

export function Recipes({ date, notify, path = "nutrition/recipes" }: {
  date: string; notify: (s?: string) => void; path?: string;
}) {
  const { state, save } = useStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [slot, setSlot] = useState(state.mealSlots[0] ?? "早餐");
  const [logDate, setLogDate] = useState(date);
  const [servings, setServings] = useState(1);
  const isDetail = path === "nutrition/recipes/detail";
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSelected(params.get("recipe"));
    const meal = params.get("meal");
    if (meal && state.mealSlots.includes(meal)) setSlot(meal);
    const d = params.get("date");
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= date) setLogDate(d);
  }, [date, state.mealSlots]);
  const recipes: RecipeItem[] = [...builtInRecipes, ...(state.recipes ?? [])];
  const recipe = recipes.find((r) => r.id === selected);
  const counts = {
    "Snacks": builtInRecipes.filter(r => r.category === "Snacks").length,
    "Breakfast": builtInRecipes.filter(r => r.category === "Breakfast").length,
    "Main Meals": builtInRecipes.filter(r => r.category === "Main Meals").length,
  };
  const filters = recipes.filter(r =>
    (!category || r.category === category) &&
    [r.name, r.nameEn, r.ingredients].join(" ").toLowerCase().includes(query.toLowerCase())
  );
  const canLog = recipe !== undefined && complete(recipe) && servings > 0 && Number.isFinite(servings);

  function addToMeal() {
    if (!recipe || !complete(recipe) || !canLog) return;
    if (save("食譜加入飲食", s => {
      pinDay(s, logDate);
      s.meals.push({
        id: uid(), date: logDate, slot, name: recipe.name,
        quantity: servings, unit: "份",
        p: round(recipe.p * servings), c: round(recipe.c * servings),
        f: round(recipe.f * servings), kcal: round(recipe.kcal * servings),
        foodId: recipe.id, foodVersion: recipe.version ?? 1, createdAt: stamp()
      });
    })) { notify("已加入 " + slot); setSelected(null); }
  }
  const details = recipe ? (
    <div className="stack">
      <p className="eyebrow">{recipe.category} · {recipe.nameEn ?? "自訂食譜"}</p>
      <p className="muted">{recipe.servingLabel ?? "每份"}的原始資料 · 營養值尚未獨立查核</p>
      <div className="recipe-nutrient-grid">
        {([["kcal", "KCAL"], ["p", "PROTEIN"], ["c", "CARBS"], ["f", "FAT"]] as const).map(([key, label]) => (
          <div className="card" key={key}>
            <small>{label}</small><strong>{recipe[key] === null ? "未提供" : value(round(recipe[key]! * servings))}</strong>
            <small>{key === "kcal" ? "kcal" : "g"}</small>
          </div>
        ))}
      </div>
      <Field label="份數"><input type="number" min="0.1" max="100" step="0.1"
        value={servings} onChange={e => setServings(Number(e.target.value))} /></Field>
      <p className="muted">{MULTIPLIER_NOTE}</p>
      <h3>食材與原始份量</h3>
      <p className="preserve-lines">{recipe.ingredients}</p>
      <h3>做法</h3>
      <p className="preserve-lines">{recipe.steps}</p>
      {recipe.notes && <><h3>延伸做法</h3><p className="preserve-lines">{recipe.notes}</p></>}
      {recipe.sourceUrl && <p className="muted">來源：<a className="text-link" href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">{recipe.source || recipe.sourceUrl} ↗</a></p>}
      {!complete(recipe) && <p className="notice error" role="alert">營養資料不完整：缺少必要的 P／C／F／kcal，不能加入飲食或把缺值當成 0。</p>}
      <Field label="加入哪一餐">
        <select value={slot} onChange={e => setSlot(e.target.value)}>
          {state.mealSlots.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <button type="button" className="button" disabled={!canLog} onClick={addToMeal}>加入 {slot}</button>
      {!isDetail && <Link className="text-link" href={`/nutrition/recipes/detail?recipe=${encodeURIComponent(recipe.id)}&meal=${encodeURIComponent(slot)}&date=${logDate}`}>開啟完整食譜頁 →</Link>}
    </div>
  ) : null;
  return (
    <div className="daily-page">
      <PageTitle title={isDetail ? (recipe?.name ?? "食譜詳細內容") : "Recipes"} />
      {isDetail ? (
        <>
          <Link className="text-link" href="/nutrition/recipes">← 回食譜資料庫</Link>
          {details ? <section className="card">{details}</section> : <p className="muted">找不到指定食譜，請回資料庫重新選擇。</p>}
        </>
      ) : (
        <>
          <NutritionSummary date={logDate} />
          <p className="muted">內建食譜索引 {builtInRecipes.length} 道（點心 {counts.Snacks}／早餐 {counts.Breakfast}／正餐 {counts["Main Meals"]}），另外保留你的自訂食譜。其中 119 道已載入原始食材／做法，另 10 道目前僅有名稱、無法作營養紀錄；來源缺少的營養值不會被當成 0。</p>
          <Field label="搜尋食譜">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜尋食譜名稱或食材" />
          </Field>
          <Field label="食譜分類">
            <select value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">全部分類</option>
              <option value="Snacks">Snacks · 點心</option>
              <option value="Breakfast">Breakfast · 早餐</option>
              <option value="Main Meals">Main Meals · 正餐</option>
              {[...new Set((state.recipes ?? []).map(r => r.category))].filter(c => !["Snacks","Breakfast","Main Meals"].includes(c)).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <p className="muted">符合條件：{filters.length} 道</p>
          <div className="recipe-list">
            {filters.map(r => (
              <button type="button" className="recipe-card" key={r.id} onClick={() => { setSelected(r.id); setServings(1); }}>
                <small>{r.category} {r.id.startsWith("seed-") ? "· BUILT-IN" : "· MY RECIPE"}</small>
                <h2>{r.name}</h2>
                {r.nameEn && <p className="muted">{r.nameEn}</p>}
                <p>P {value(r.p)} · C {value(r.c)} · F {value(r.f)}</p>
                <span>{r.kcal === null ? "熱量未提供" : `${r.kcal} kcal / 份`}</span>
                {!complete(r) && <small>營養／原稿資料不完整 · 無法加入紀錄</small>}
              </button>
            ))}
          </div>
          {!filters.length && <p className="empty">目前沒有符合搜尋條件的食譜。</p>}
          <button type="button" className="button secondary" onClick={() => setCreate(true)}>新增自訂食譜</button>
          {recipe && <Sheet title={recipe.name} onClose={() => setSelected(null)}>{details}</Sheet>}
        </>
      )}
      {create && (
        <Sheet title="新增食譜" onClose={() => setCreate(false)}>
          <form onSubmit={e => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            const p = Number(data.get("p")), c = Number(data.get("c")), f = Number(data.get("f"));
            if (save("新增食譜版本", s => {
              (s.recipes ??= []).push({
                id: uid(), name: String(data.get("name")).trim(), category: String(data.get("category")).trim(),
                ingredients: String(data.get("ingredients")), steps: String(data.get("steps")),
                p, c, f, kcal: round(p * 4 + c * 4 + f * 9), version: 1,
              });
            })) { setCreate(false); notify("已保存自訂食譜"); }
          }}>
            <Field label="食譜名稱"><input name="name" required maxLength={80}/></Field>
            <Field label="分類"><select name="category"><option>Snacks</option><option>Breakfast</option><option>Main Meals</option></select></Field>
            <Field label="食材"><textarea name="ingredients" required maxLength={3000}/></Field>
            <Field label="做法"><textarea name="steps" required maxLength={5000}/></Field>
            <div className="form-grid">
              {([["p","蛋白質"],["c","碳水"],["f","脂肪"]] as const).map(([n,label]) => (
                <Field key={n} label={label+" g"}><input type="number" name={n} required min="0" max="1000" step="0.1"/></Field>
              ))}
            </div>
            <button className="button">儲存食譜</button>
          </form>
        </Sheet>
      )}
    </div>
  );
}
