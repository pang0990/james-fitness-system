"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { mealTotals, pinDay, round } from "@/lib/domain";
import { PageTitle, Field, Sheet, NutritionSummary, uid, stamp } from "./daily";
export function Recipes({
  date,
  notify,
}: {
  date: string;
  notify: (s?: string) => void;
}) {
  const { state, save } = useStore();
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [create, setCreate] = useState(false),
    [selected, setSelected] = useState<string | null>(null),
    [slot, setSlot] = useState(state.mealSlots[0] ?? "早餐"),
    [logDate, setLogDate] = useState(date),
    [servings, setServings] = useState(1);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("meal")) setSlot(p.get("meal")!);
    const d = p.get("date");
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= date) setLogDate(d);
  }, [date]);
  const recipes = state.recipes ?? [],
    recipe = recipes.find((r) => r.id === selected);
  return (
    <div className="daily-page">
      <PageTitle title="Recipes" />
      <NutritionSummary date={logDate} />
      <Field label="搜尋食譜">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="食譜名稱或食材"
        />
      </Field>
      <Field label="食譜分類">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">全部</option>
          {[...new Set(recipes.map((r) => r.category))].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <div className="recipe-list">
        {recipes
          .filter(
            (r) =>
              (!category || r.category === category) &&
              `${r.name} ${r.ingredients}`
                .toLowerCase()
                .includes(query.toLowerCase()),
          )
          .map((r) => (
            <button
              key={r.id}
              className="recipe-card"
              onClick={() => {
                setSelected(r.id);
                setServings(1);
              }}
            >
              <small>{r.category}</small>
              <h2>{r.name}</h2>
              <p>
                P {r.p} · C {r.c} · F {r.f}
              </p>
              <span>{r.kcal} kcal / 份</span>
            </button>
          ))}
      </div>
      {!recipes.length && (
        <p className="empty">
          尚未建立食譜。新增食材、做法與每份營養素後，即可重複加入餐次。
        </p>
      )}
      <button className="button secondary" onClick={() => setCreate(true)}>
        新增食譜
      </button>
      {recipe && (
        <Sheet title={recipe.name} onClose={() => setSelected(null)}>
          <p>
            P {recipe.p} · C {recipe.c} · F {recipe.f} / 份
          </p>
          <h3>食材</h3>
          <p className="preserve-lines">{recipe.ingredients}</p>
          <h3>做法</h3>
          <p className="preserve-lines">{recipe.steps}</p>
          <Field label="加入餐次">
            <select value={slot} onChange={(e) => setSlot(e.target.value)}>
              {state.mealSlots.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="份數">
            <input
              type="number"
              min="0.1"
              max="100"
              step="0.1"
              value={servings}
              onChange={(e) => setServings(Number(e.target.value))}
            />
          </Field>
          <button
            className="button"
            disabled={servings <= 0 || !Number.isFinite(servings)}
            onClick={() => {
              if (
                save("食譜加入飲食", (s) => {
                  pinDay(s, logDate);
                  s.meals.push({
                    id: uid(),
                    date: logDate,
                    slot,
                    name: recipe.name,
                    quantity: servings,
                    unit: "份",
                    p: round(recipe.p * servings),
                    c: round(recipe.c * servings),
                    f: round(recipe.f * servings),
                    kcal: round(recipe.kcal * servings),
                    foodId: recipe.id,
                    foodVersion: recipe.version,
                    createdAt: stamp(),
                  });
                })
              ) {
                notify();
                setSelected(null);
              }
            }}
          >
            加入 {slot}
          </button>
        </Sheet>
      )}
      {create && (
        <Sheet title="新增食譜" onClose={() => setCreate(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget),
                p = Number(d.get("p")),
                c = Number(d.get("c")),
                f = Number(d.get("f"));
              if (
                save("新增食譜版本", (s) =>
                  (s.recipes ??= []).push({
                    id: uid(),
                    name: String(d.get("name")).trim(),
                    category: String(d.get("category")).trim(),
                    ingredients: String(d.get("ingredients")),
                    steps: String(d.get("steps")),
                    p,
                    c,
                    f,
                    kcal: round(p * 4 + c * 4 + f * 9),
                    version: 1,
                  }),
                )
              ) {
                setCreate(false);
                notify();
              }
            }}
          >
            {[
              ["name", "食譜名稱"],
              ["category", "分類"],
            ].map(([n, l]) => (
              <Field key={n} label={l}>
                <input name={n} required maxLength={80} />
              </Field>
            ))}
            <Field label="每份食材與份量">
              <textarea name="ingredients" required maxLength={3000} />
            </Field>
            <Field label="做法">
              <textarea name="steps" required maxLength={5000} />
            </Field>
            <div className="form-grid">
              {[
                ["p", "蛋白質"],
                ["c", "碳水"],
                ["f", "脂肪"],
              ].map(([n, l]) => (
                <Field key={n} label={`每份${l} g`}>
                  <input
                    name={n}
                    type="number"
                    required
                    min="0"
                    max="1000"
                    step="0.1"
                  />
                </Field>
              ))}
            </div>
            <button className="button">保存食譜</button>
          </form>
        </Sheet>
      )}
    </div>
  );
}
