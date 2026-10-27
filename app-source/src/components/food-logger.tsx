"use client";
import { useEffect, useRef, useState } from "react";
import { FoodPicker, Field, uid, stamp } from "./daily";
import { useStore } from "@/lib/store";
import {
  addDays,
  dayNames,
  resolveDay,
  visibleMeals,
  type Food,
} from "@/lib/domain";
import {
  commitPlate,
  foodSnapshot,
  mealSnapshot,
  portion,
  suggestedFoodIds,
  type PlateItem,
  type MealSnapshot,
} from "@/lib/food-plate";
import { validateNewMealInput } from "@/lib/nutrition-input";
import master from "@/content/foods.json";
import cooked from "@/content/cooked-foods.json";
import official from "@/content/fda-foods.json";
import recipes from "@/content/recipes-seed.json";

export function NutritionWeek({
  date,
  onChange,
}: {
  date: string;
  onChange: (d: string) => void;
}) {
  const { state } = useStore();
  const offset = (new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7;
  const start = addDays(date, -offset);
  return (
    <section aria-label="飲食七日日期列" className="nutrition-week">
      <div className="two-actions">
        <button
          type="button"
          className="text-link"
          onClick={() => onChange(addDays(date, -7))}
        >
          ← 前一週
        </button>
        <button
          type="button"
          className="text-link"
          onClick={() => onChange(addDays(date, 7))}
        >
          下一週 →
        </button>
      </div>
      <div className="nutrition-week-days">
        {Array.from({ length: 7 }, (_, i) => {
          const d = addDays(start, i),
            day = resolveDay(state, d),
            logged = visibleMeals(state, d).length;
          return (
            <button
              type="button"
              key={d}
              aria-label={`${d} ${day.complete ? "已完成" : logged ? "有紀錄" : "未記錄"}`}
              aria-pressed={d === date}
              onClick={() => onChange(d)}
            >
              <small>{"一二三四五六日"[i]}</small>
              <strong>{d.slice(8)}</strong>
              <small>
                {day.complete ? "已完成" : logged ? "有紀錄" : "未記錄"}
              </small>
              <small>{dayNames[day.dayType]}</small>
            </button>
          );
        })}
      </div>
      <p className="muted">未記錄不代表沒有進食；點選日期查看當天紀錄。</p>
    </section>
  );
}
export function FoodLogger({
  date,
  slot,
  onSlot,
  onDone,
  onDirty,
  initialTab = "food",
}: {
  date: string;
  slot: string;
  onSlot: (s: string) => void;
  onDone: () => void;
  onDirty: (dirty: boolean) => void;
  initialTab?: string;
}) {
  const { state, save, error } = useStore();
  const [tab, setTab] = useState(initialTab),
    [plate, setPlate] = useState<PlateItem[]>([]),
    [message, setMessage] = useState("");
  const [sourceDate, setSourceDate] = useState(addDays(date, -1)),
    [sourceSlot, setSourceSlot] = useState(slot);
  const [targetDate, setTargetDate] = useState(date),
    [templateName, setTemplateName] = useState("");
  const lock = useRef(false);
  const [units, setUnits] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!plate.length) return;
    const stop = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", stop);
    return () => window.removeEventListener("beforeunload", stop);
  }, [plate.length]);
  function add(snapshot: MealSnapshot) {
    onDirty(true);
    setPlate((items) => [
      ...items,
      {
        id: uid(),
        snapshot: mealSnapshot(snapshot),
        quantity: snapshot.quantity,
      },
    ]);
    setMessage("已加入待確認清單，尚未儲存");
  }
  function addMany(items: MealSnapshot[]) {
    if(items.length)onDirty(true);
    setPlate((old) => [
      ...old,
      ...items.map((snapshot) => ({
        id: uid(),
        snapshot: mealSnapshot(snapshot),
        quantity: snapshot.quantity,
      })),
    ]);
    setMessage("已加入待確認清單，可調整份量或移除");
  }
  let valid = true;
  const totals = { p: 0, c: 0, f: 0, kcal: 0 };
  for (const item of plate) {
    try {
      const p = portion(item);
      validateNewMealInput({ ...p, slot });
      for (const k of ["p", "c", "f", "kcal"] as const) totals[k] += p[k];
    } catch {
      valid = false;
    }
  }
  const library = [...master, ...cooked, ...official, ...state.foods] as Food[];
  const suggestions = suggestedFoodIds(state, slot)
    .map((id) => library.find((f) => f.id === id))
    .filter((f): f is Food => !!f)
    .slice(0, 6);
  const copyItems = /^\d{4}-\d{2}-\d{2}$/.test(sourceDate)
    ? visibleMeals(state, sourceDate).filter((m) => m.slot === sourceSlot)
    : [];
  const availableSlots = Array.from(
    new Set([
      ...state.mealSlots,
      ...visibleMeals(state, sourceDate).map((m) => m.slot),
    ]),
  );
  return (
    <div className="stack food-logger">
      <div className="form-grid">
        <Field label="記錄日期">
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </Field>
        <Field label="加入哪一餐">
          <select
            aria-label="加入哪一餐"
            value={slot}
            onChange={(e) => onSlot(e.target.value)}
          >
            {Array.from(new Set([...state.mealSlots, slot])).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
      </div>
      <nav className="logger-tabs" aria-label="記錄方式">
        {[
          ["food", "食物搜尋"],
          ["quick", "Quick Macro"],
          ["copy", "複製餐點"],
          ["saved", "常吃套餐"],
          ["recipes", "食譜"],
        ].map(([value, label]) => (
          <button
            type="button"
            className="button secondary"
            aria-pressed={tab === value}
            key={value}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "food" && (
        <>
          <details open={suggestions.length > 0}>
            <summary>{slot}常用食物</summary>
            {suggestions.length ? (
              suggestions.map((f) => (
                <button
                  type="button"
                  className="button secondary"
                  key={f.id}
                  onClick={() => add(foodSnapshot(f))}
                >
                  ＋ {f.name}
                </button>
              ))
            ) : (
              <p className="muted">
                這一餐還沒有可用的食物紀錄，請搜尋或選收藏。
              </p>
            )}
          </details>
          <FoodPicker addToPlate onSelect={(f) => add(foodSnapshot(f as Food))} />
        </>
      )}
      {tab === "quick" && (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget,
              data = new FormData(form),
              p = Number(data.get("p")),
              c = Number(data.get("c")),
              f = Number(data.get("f"));
            try {
              const meal = validateNewMealInput({
                name: String(data.get("name")),
                slot,
                quantity: 1,
                p,
                c,
                f,
                kcal: p * 4 + c * 4 + f * 9,
              });
              add({ ...meal, unit: "份" });
              form.reset();
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "輸入無效");
            }
          }}
        >
          <Field label="這餐吃了什麼">
            <input name="name" maxLength={80} required />
          </Field>
          <div className="form-grid">
            {["p", "c", "f"].map((k) => (
              <Field
                key={k}
                label={
                  (
                    { p: "蛋白質 g", c: "碳水 g", f: "脂肪 g" } as Record<
                      string,
                      string
                    >
                  )[k]
                }
              >
                <input
                  name={k}
                  type="number"
                  min={0}
                  max={1000}
                  step="0.1"
                  required
                />
              </Field>
            ))}
          </div>
          <button className="button secondary">加入 Quick Macro 至清單</button>
        </form>
      )}
      {tab === "copy" && (
        <div className="stack">
          <Field label="來源日期">
            <input
              type="date"
              value={sourceDate}
              onChange={(e) => setSourceDate(e.target.value)}
            />
          </Field>
          <Field label="來源餐次">
            <select
              aria-label="來源餐次"
              value={sourceSlot}
              onChange={(e) => setSourceSlot(e.target.value)}
            >
              {availableSlots.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <p className="muted">
            複製當時的份量與營養快照，不會依目前食品資料重新計算。加入清單後可移除不需要的食物。
          </p>
          {copyItems.map((m) => (
            <div className="simple-row" key={m.id}>
              <span>
                {m.name} · {m.quantity} {m.unit}
              </span>
              <button
                type="button"
                className="text-link"
                onClick={() => add(mealSnapshot(m))}
              >
                選取
              </button>
            </div>
          ))}
          {!copyItems.length ? (
            <p>這一天這一餐沒有有效紀錄。</p>
          ) : (
            <button
              type="button"
              className="button secondary"
              onClick={() => addMany(copyItems)}
            >
              選取整餐至清單
            </button>
          )}
        </div>
      )}
      {tab === "saved" && (
        <div className="stack">
          <p className="muted">
            常吃套餐保存多項食物快照，與料理食譜分開管理。
          </p>
          {state.savedMeals?.map((t) => (
            <div className="simple-row" key={t.id}>
              <span>
                {t.name} · {t.items.length} 項
              </span>
              <button
                type="button"
                className="text-link"
                onClick={() => addMany(t.items)}
              >
                加入套餐
              </button>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  if (confirm("刪除套餐？已記錄餐點不受影響。"))
                    save("刪除常吃套餐", (s) => {
                      s.savedMeals = s.savedMeals?.filter((x) => x.id !== t.id);
                    });
                }}
              >
                刪除
              </button>
            </div>
          ))}
          {!state.savedMeals?.length && (
            <p>尚無套餐。先把食物加入清單，再儲存為套餐。</p>
          )}
        </div>
      )}
      {tab === "recipes" && (
        <div className="stack">
          <p className="muted">
            沿用食譜原有的每份營養；缺少營養資料的食譜不能加入。食材文字不會自動換算。
          </p>
          {[...recipes, ...(state.recipes ?? [])].map((r) => {
            const complete = [r.p, r.c, r.f, r.kcal].every(
              (v) => typeof v === "number" && Number.isFinite(v) && v >= 0,
            );
            return (
              <div className="simple-row" key={r.id}>
                <span>{r.name}</span>
                <button
                  type="button"
                  className="text-link"
                  disabled={!complete}
                  onClick={() =>
                    add({
                      name: r.name,
                      quantity: 1,
                      unit: "份",
                      foodId: r.id,
                      foodVersion: "version" in r ? r.version : 1,
                      p: r.p!,
                      c: r.c!,
                      f: r.f!,
                      kcal: r.kcal!,
                    })
                  }
                >
                  {complete ? "加入食譜" : "營養未提供"}
                </button>
              </div>
            );
          })}
        </div>
      )}
      <section className="card stack food-plate" aria-label="待確認食物清單">
        <h3>待確認清單 · {plate.length} 項</h3>
        <p className="muted">
          份量單位沿用資料來源；只有 g 可以使用克數快捷鍵。尚未寫入正式紀錄。
        </p>
        {plate.map((item) => {
          const displayUnit = units[item.id] ?? item.snapshot.unit;
          const divisor =
            item.snapshot.unit === "g" && displayUnit === "kg" ? 1000 : 1;
          let preview: MealSnapshot | undefined;
          try {
            preview = portion(item);
          } catch {}
          return (
            <div className="plate-row stack" key={item.id}>
              <strong>{item.snapshot.name}</strong>
              <Field
                label={"份量 " + item.snapshot.name + " (" + displayUnit + ")"}
              >
                <input
                  type="number"
                  min="0.1"
                  max="10000"
                  step="any"
                  value={item.quantity / divisor || ""}
                  onChange={(e) =>
                    setPlate((xs) =>
                      xs.map((x) =>
                        x.id === item.id
                          ? { ...x, quantity: Number(e.target.value) * divisor }
                          : x,
                      ),
                    )
                  }
                />
              </Field>
              {item.snapshot.unit === "g" && (
                <Field label={"單位 " + item.snapshot.name}>
                  <select
                    value={displayUnit}
                    onChange={(e) =>
                      setUnits((old) => ({ ...old, [item.id]: e.target.value }))
                    }
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                  </select>
                </Field>
              )}
              {item.snapshot.unit === "g" && (
                <div className="logger-tabs">
                  {[50, 100, 150, 200].map((q) => (
                    <button
                      type="button"
                      className="button secondary"
                      key={q}
                      onClick={() =>
                        setPlate((xs) =>
                          xs.map((x) =>
                            x.id === item.id ? { ...x, quantity: q } : x,
                          ),
                        )
                      }
                    >
                      {q} g
                    </button>
                  ))}
                </div>
              )}
              <small>
                {preview && Number.isFinite(preview.kcal)
                  ? `P ${preview.p} · C ${preview.c} · F ${preview.f} · ${preview.kcal} kcal`
                  : "請確認份量"}
              </small>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  onDirty(plate.length>1);
                  setPlate((xs) => xs.filter((x) => x.id !== item.id));
                }}
              >
                移除 {item.snapshot.name}
              </button>
            </div>
          );
        })}
        {!plate.length && (
          <p className="muted">搜尋食物或複製餐點，連續加入後一起確認。</p>
        )}
        {!!plate.length && (
          <>
            <Field label="套餐名稱（選填）">
              <input
                maxLength={80}
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </Field>
            <button
              type="button"
              className="button secondary"
              disabled={!valid || !templateName.trim()}
              onClick={() => {
                if (
                  save("儲存常吃套餐", (s) => {
                    (s.savedMeals ??= []).push({
                      id: uid(),
                      name: templateName.trim(),
                      createdAt: stamp(),
                      items: plate.map(portion),
                    });
                  })
                ) {
                  setTemplateName("");
                  setMessage("套餐已儲存；清單尚未加入當日紀錄");
                }
              }}
            >
              儲存清單為套餐
            </button>
          </>
        )}
      </section>
      <div className="food-plate-confirm">
        <small>
          {targetDate} · {slot}
        </small>
        <p>
          {valid
            ? `合計 ${Math.round(totals.kcal)} kcal · P ${Math.round(totals.p)} / C ${Math.round(totals.c)} / F ${Math.round(totals.f)}`
            : "請修正食物份量"}
        </p>
        <button
          type="button"
          className="button"
          disabled={!plate.length || !valid || !targetDate}
          onClick={() => {
            if (lock.current) return;
            lock.current = true;
            try {
              if (
                save("批次新增飲食", (s) =>
                  commitPlate(s, plate, targetDate, slot, stamp()),
                )
              ) {
                onDirty(false);
                setPlate([]);
                onDone();
              } else setMessage("儲存失敗，清單仍保留，請重試");
            } finally {
              lock.current = false;
            }
          }}
        >
          確認加入 {plate.length} 項食物
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
