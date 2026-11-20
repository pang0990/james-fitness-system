"use client";
import { FoodLogger,NutritionWeek } from "./food-logger";
import { NutritionDashboardV3 } from "./nutrition-dashboard-v3";
import { validateNewMealInput } from "@/lib/nutrition-input";
import type { MealSnapshot } from "@/lib/food-plate";
import Link from "next/link";
import { RecoveryQuickLog } from "./recovery-log";
import { latestRecovery } from "@/lib/recovery";


import {
useEffect,useRef,
useState,
type ReactNode,
type FormEvent,
type CSSProperties
} from "react";
import {
ArrowRight,ChevronRight,Ellipsis,
Plus,CalendarDays,
ChevronDown,
ChevronUp
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
dateInZone,
addDays,
dayNames,
mealTotals,
syncMealCompletion,
resolveDay,
visibleMeals,
visibleMeasurements,
waterTotal,
pinDay,
setDayType,
round,
type DayType,
type Food,
type Meal
} from "@/lib/domain";
import master from "@/content/foods.json";
import cooked from "@/content/cooked-foods.json";
import official from "@/content/fda-foods.json";
import builtInRecipes from "@/content/recipes-seed.json";
import { Sheet } from "./ui/sheet";
export const uid = () => crypto.randomUUID();
export const stamp = () => new Date().toISOString();
export { Sheet } from "./ui/sheet";
export function Menu({ items }: { items: [string, string][] }) {
  return (
    <details className="overflow-menu">
      <summary aria-label="更多選項">
        <Ellipsis />
      </summary>
      <div>
        {items.map(([href, label]) => (
          <Link key={href} href={href}>
            {label}
            <ChevronRight size={16} />
          </Link>
        ))}
      </div>
    </details>
  );
}
export function PageTitle({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children?: ReactNode;
}) {
  return (
    <div className="simple-heading">
      <div>{eyebrow && <span className="workspace-label">{eyebrow}</span>}<h1>{title}</h1></div>
      {children}
    </div>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Num({
  label,
  name,
  value,
  min = 0,
  max = 10000,
  step = "0.1",
  required = true,
}: {
  label: string;
  name: string;
  value?: number;
  min?: number;
  max?: number;
  step?: string;
  required?: boolean;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        name={name}
        defaultValue={value}
        min={min}
        max={max}
        step={step}
        required={required}
      />
    </Field>
  );
}
export function NutritionSummary({ date, variant = "compact" }: { date: string; variant?: "compact" | "full" }) {
  const { state } = useStore();
  const d = resolveDay(state, date);
  const meals = visibleMeals(state, date);
  const total = mealTotals(state, date);
  const recorded = meals.length > 0 || d.complete;
  if(variant==="full") {
    const calorieTarget=d.target?.kcal??0;
    const pct=calorieTarget>0?Math.min(100,Math.max(0,(total.kcal/calorieTarget)*100)):0;
    const remaining=calorieTarget>0?Math.round(calorieTarget-total.kcal):null;
    return <div className="nutrition-v3-panel" id="nutrition-calories">
      <div className="nutrition-v3-section-label">CALORIES <span>{dayNames[d.dayType] ?? d.dayType}</span></div>
      <div className="nutrition-v3-energy">
        <div className="nutrition-v3-calorie-ring" role="img"
          aria-label={`已攝取 ${recorded?total.kcal:"尚未記錄"}，目標 ${calorieTarget||"未設定"} kcal`}
          style={{"--jfs2-fill":`${pct}%`} as CSSProperties}>
          <div className="nutrition-v3-ring-inner">
            <strong>{recorded?Math.round(total.kcal).toLocaleString("en-US"):"—"}</strong>
            <small>/ {calorieTarget?calorieTarget.toLocaleString("en-US"):"—"} kcal</small>
          </div>
        </div>
        <div className="nutrition-v3-remaining"><span>REMAINING</span>
          <strong>{remaining===null?"—":remaining.toLocaleString("en-US")}</strong>
          <small>kcal</small>
        </div>
      </div>
      <div className="nutrition-v3-macros" aria-label="三大營養素">
        {(["p","c","f"] as const).map((key,i)=>{
          const target=d.target?.[key]??0;
          const percent=target>0?Math.min(100,Math.max(0,total[key]/target*100)):0;
          const label=["Protein","Carbs","Fat"][i];
          return <div className="nutrition-v3-macro" key={key}>
            <div className="nutrition-v3-mini-ring" style={{"--jfs2-fill":`${percent}%`} as CSSProperties}>
              <span>{Math.round(percent)}%</span>
            </div>
            <strong>{label}</strong>
            <small>{recorded?Math.round(total[key]):"—"} / {target?Math.round(target):"—"} g</small>
          </div>;
        })}
      </div>
      {!d.target&&<Link href="/onboarding" className="text-link">設定營養目標 <ArrowRight size={14}/></Link>}
    </div>;
  }
  return (
    <>
      <div className="macro-summary">
        {(["p", "c", "f"] as const).map((key, i) => (
          <div key={key} data-nutrient={key}>
            <span>{["蛋白質", "碳水化合物", "脂肪"][i]}</span>
            <strong>
              {recorded ? total[key] : "—"}
              <small> / {d.target?.[key] ?? "—"} g</small>
            </strong>
            <div className="track">
              <span
                style={{
                  width: `${d.target?.[key] ? Math.min(100, (total[key] / d.target[key]) * 100) : 0}%`,
                }}
              />
            </div>
            <small>
              {!recorded
                ? "尚未紀錄"
                : d.target
                  ? total[key] > d.target[key]
                    ? `超出 ${round(total[key] - d.target[key])} g`
                    : `剩餘 ${round(d.target[key] - total[key])} g`
                  : "尚未設定目標"}
            </small>
          </div>
        ))}
      </div>
      <div className="calorie-line">
        <span>熱量</span>
        <span>
          {recorded ? total.kcal : "尚未紀錄"} / {d.target?.kcal ?? "—"} kcal
        </span>
      </div>
      {!d.target && (
        <Link className="text-link" href="/onboarding">
          {state.profile?.goal === "GAIN" ? "GAIN 基準追蹤中" : "設定營養目標"}
          <ArrowRight size={16} />
        </Link>
      )}
    </>
  );
}
const categories = ["碳水化合物", "蛋白質", "脂肪", "蔬菜", "水果", "自訂"];
export type LibraryFood = Food & {
  nameEn?: string;
  sourceUrl?: string;
  sourceDescription?: string;
};
export function FoodPicker({
  onSelect,
  onRecipeSelect,
  addToPlate = false,
  mine = false,
}: {
  mine?: boolean;
  addToPlate?: boolean;
  onSelect: (f: LibraryFood, recentQuantity?: number) => void;
  onRecipeSelect?: (recipe: MealSnapshot) => void;
}) {
  const { state, save } = useStore();
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [limit, setLimit] = useState(30);
  const [focused, setFocused] = useState(false);
  const [resultType, setResultType] = useState<"all" | "food" | "recipe">("all");
  const foods = (
    mine ? state.foods : [...master, ...cooked, ...official, ...state.foods]
  ) as LibraryFood[];
  const recentPortions = new Map<string, { at: string; quantity: number; unit: string }>();
  const counts = new Map<string, number>(),
    recent = new Map<string, string>();
  for (const m of visibleMeals(state)) {
    if (m.foodId) {
      if (Number.isFinite(m.quantity) && m.quantity > 0 && m.quantity <= 10000 &&
          (recentPortions.get(m.foodId)?.at ?? "") <= m.createdAt) {
        recentPortions.set(m.foodId, { at: m.createdAt, quantity: m.quantity, unit: m.unit });
      }
      counts.set(m.foodId, (counts.get(m.foodId) ?? 0) + 1);
      recent.set(m.foodId, (recent.get(m.foodId)??"") > m.createdAt ? recent.get(m.foodId)! : m.createdAt);
    }
  }
  const filtered = foods.filter(
    (f) =>
      (source === "all" ||
        (source === "favorites" && state.favoriteFoods?.includes(f.id)) ||
        (["recent", "frequent"].includes(source) && counts.has(f.id)) ||
        (source === "mine" && f.source === "User")) &&
      (!category || f.category === category) &&
      `${f.name} ${f.nameEn ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  if (source === "frequent")
    filtered.sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));
  if (source === "recent")
    filtered.sort((a, b) =>
      (recent.get(b.id) ?? "").localeCompare(recent.get(a.id) ?? ""),
    );
  const recipeResults = onRecipeSelect && !!search.trim() ?
    [...builtInRecipes, ...(state.recipes ?? [])].filter((r) =>
      r.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) &&
      [r.p, r.c, r.f, r.kcal].every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0)
    ).slice(0, limit) : [];
  return (
    <div className="food-picker food-picker--compact">
      <Field label="搜尋食物">
        <input
          type="search"
          value={search}
          onFocus={() => setFocused(true)}
          onChange={(e) => { setSearch(e.target.value); setLimit(30); setFocused(true); }}
          placeholder={onRecipeSelect ? "搜尋食物或食譜..." : "中文或 English"}
        />
      </Field>
      {addToPlate && !search && !focused && ["最近使用", "我的收藏"].map(label => {
        const recentOnly = label === "最近使用";
        const ids = recentOnly
          ? [...recentPortions].sort((a,b) => b[1].at.localeCompare(a[1].at)).map(([id]) => id)
          : state.favoriteFoods ?? [];
        return <section key={label} className="logger-shortcuts"><h3>{label}</h3>
          {ids.length === 0 && <p className="muted">尚無紀錄</p>}
          {ids.slice(0,8).map(id => {
            const item = foods.find(food => food.id === id);
            if (!item) return null;
            const last = recentPortions.get(id);
            const amount = recentOnly && last?.unit === item.unit ? last.quantity : item.base;
            return <button type="button" className="button secondary" key={id}
              onClick={() => onSelect(item, amount)}>{item.name} · {amount} {item.unit}</button>;
          })}
        </section>;
      })}
      {(focused || !!search.trim()) && (
        <>
          <div className="food-picker-sources" role="group" aria-label="食物來源">
            {([["all","全部"],["recent","最近"],["frequent","常吃"],["favorites","收藏"],["mine","我的食物"]] as const).map(([id,label]) => (
              <button key={id} type="button" className="food-filter-chip" aria-pressed={source === id}
                onClick={() => { setSource(id); setLimit(30); }}>{label}</button>
            ))}
          </div>
          {onRecipeSelect && <div className="food-picker-types" role="group" aria-label="搜尋類型">
            {([["all","全部結果"],["food","食物"],["recipe","食譜"]] as const).map(([id,label]) => (
              <button key={id} type="button" aria-pressed={resultType === id}
                onClick={() => setResultType(id)}>{label}</button>
            ))}
          </div>}
          <details className="food-picker-categories">
            <summary>分類篩選{category ? " · " + category : ""} <ChevronDown size={16} aria-hidden="true" /></summary>
            <Field label="食物分類">
              <select value={category} onChange={(e) => { setCategory(e.target.value); setLimit(30); }}>
                <option value="">所有分類</option>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </details>
        </>
      )}
      {resultType !== "recipe" && (!addToPlate || focused || !!search.trim()) && (
        <>
          <p className="muted food-count">{filtered.length} 項食物</p>
          <ul className="food-list">
            {filtered.slice(0, limit).map((f) => (
              <li key={f.id} className="food-with-favorite">
                <button type="button" onClick={() => onSelect(f, source === "recent" && recentPortions.get(f.id)?.unit === f.unit ? recentPortions.get(f.id)?.quantity : undefined)}
                  aria-label={"選擇 " + f.name} className="food-result-select">
                  <span className="food-result-text">
                    <strong>{f.name}</strong>
                    {f.nameEn && <small lang="en">{f.nameEn}</small>}
                    <span>{f.base} {f.unit} · {f.kcal} kcal</span>
                  </span>
                  {addToPlate ? <Plus size={22} aria-hidden="true" /> : <ChevronRight size={20} aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
          {!filtered.length && <p className="empty">找不到符合的食物，請調整搜尋。</p>}
          {filtered.length > limit && <button className="button secondary" type="button"
            onClick={() => setLimit(limit + 30)}>顯示更多</button>}
        </>
      )}
      {onRecipeSelect && resultType !== "food" && !!search.trim() && (
        <section className="food-search-recipes" aria-label="食譜搜尋結果">
          <h3>食譜 · {recipeResults.length} 項符合</h3>
          {recipeResults.map((r) => (
            <button key={r.id} className="food-result-select" type="button"
              onClick={() => onRecipeSelect({
                name:r.name, quantity:1, unit:"份", foodId:r.id,
                foodVersion:"version" in r ? r.version : 1,
                p:r.p!, c:r.c!, f:r.f!, kcal:r.kcal!,
              })}>
              <span>{r.name}</span><Plus size={20} aria-hidden="true" />
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
/** A compact native modal for editing a meal name, not the full-height food Sheet. */
function MealNameQuickEdit({
  name,
  onClose,
  onSave,
}: {
  name: string;
  onClose: () => void;
  onSave: (next: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="meal-name-quick-dialog"
      aria-label="修改餐次名稱"
      onCancel={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(String(new FormData(e.currentTarget).get("name") ?? ""));
        }}
      >
        <label htmlFor="meal-quick-name">餐次名稱</label>
        <input id="meal-quick-name" name="name" defaultValue={name} maxLength={30} required autoFocus />
        <div className="meal-name-quick-actions">
          <button type="button" onClick={onClose}>取消</button>
          <button type="submit">儲存</button>
        </div>
      </form>
    </dialog>
  );
}

export function NutritionV2({
  path,
  date,
  notify,
  inlineClose,
}: {
  inlineClose?: () => void;
  path: string;
  date: string;
  notify: (s?: string) => void;
}) {
  const { state, save } = useStore();
  const [selectedDate, setDate] = useState(date);
  const [health, setHealth] = useState<"water" | "weight" | "sleep" | null>(null);
  const [expandedMeals, setExpandedMeals] = useState<string[]>([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [customFoodEdit, setCustomFoodEdit] = useState<Food | null>(null);
  const [editAmountText, setEditAmountText] = useState("");
  const [loggerDirty,setLoggerDirty] = useState(false);
  const [loggerTab,setLoggerTab] = useState("food");
  const [sheet, setSheet] = useState<
    | "meal"
    | "rename"
    | "myfood"
    | "add"
    | "manual"
    | "food"
    | "portion"
    | "custom"
    | null
  >(path === "nutrition/log" ? "meal" : null);
  const [food, setFood] = useState<LibraryFood | null>(null);
  const [edit, setEdit] = useState<Meal | null>(null);
  const [slot, setSlot] = useState(state.mealSlots[0]);
  const [quantity, setQuantity] = useState(0);
  const [renameSlot, setRenameSlot] = useState("");
  const [mealError, setMealError] = useState("");
  const day = resolveDay(state, selectedDate);
  const meals = visibleMeals(state, selectedDate);
  const dayWeight = visibleMeasurements(state).filter(m => m.date === selectedDate && m.weight != null).at(-1)?.weight;
  const recoveryCount = latestRecovery(state, selectedDate).length;
  const isLibrary = path === "nutrition/foods";
  function close() {
    if(loggerDirty && !window.confirm("離開並放棄待確認食物？已儲存的紀錄不受影響。")) return;
    setLoggerDirty(false);
    setLoggerTab("food");
    inlineClose?.();
    setSheet(null);
    setEdit(null);
    setFood(null);
    setCustomFoodEdit(null);
    setMealError("");
  }
  function log(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMealError("");
    const d = new FormData(e.currentTarget);
    const editQuantity = edit ? Number(editAmountText) : 1;
    const factor = food ? quantity / food.base : edit && edit.quantity > 0 ? editQuantity / edit.quantity : 1;
    const p = round(food ? food.p * factor : edit ? edit.p * factor : Number(d.get("p")));
    const c = round(food ? food.c * factor : edit ? edit.c * factor : Number(d.get("c")));
    const f = round(food ? food.f * factor : edit ? edit.f * factor : Number(d.get("f")));
    let meal;
    try {
      meal = validateNewMealInput({
        name: food?.name ?? String(d.get("name") ?? ""),
        slot: String(d.get("slot") ?? ""),
        quantity: food ? quantity : edit ? editQuantity : 1,
        p, c, f,
        kcal: round(food ? food.kcal * factor : edit ? edit.kcal * factor : p * 4 + c * 4 + f * 9),
      });
    } catch (error) {
      setMealError(error instanceof Error ? error.message : "飲食數值無效");
      return;
    }
    if (save(edit ? "修正飲食" : "新增飲食", (s) => {
      pinDay(s, selectedDate);
      s.meals.push({
        id: uid(),
        date: selectedDate,
        ...meal,
        unit: food?.unit ?? edit?.unit ?? "份",
        foodId: food?.id ?? edit?.foodId,
        foodVersion: food?.version ?? edit?.foodVersion,
        createdAt: stamp(),
        ...(edit ? { supersedes: edit.id } : {}),
      });
      syncMealCompletion(s, selectedDate);
    })) {
      notify();
      close();
    } else {
      setMealError("儲存失敗，輸入仍保留；請檢查頁面上方的資料狀態後重試。");
    }
  }
  return (
    <div className={inlineClose ? "inline-nutrition" : "daily-page"}>
      <PageTitle title={isLibrary ? "食物庫" : "每日紀錄"} eyebrow={isLibrary ? "FOOD LIBRARY" : "DAILY JOURNAL"}>
        <Menu
          items={[
            ["/nutrition/plan", "營養計畫"],
            ["/nutrition/foods", "食物庫"],
            ["/progress/history", "計畫紀錄"],
          ]}
        />
      </PageTitle>
      {isLibrary ? (
        <>
          <section className="my-food-manager" aria-label="我的食物管理">
            <div className="my-food-manager-header">
              <h2>我的食物</h2>
              <button type="button" className="button secondary" onClick={() => {
                setCustomFoodEdit(null);setSheet("custom");
              }}><Plus size={16}/> 新增食物</button>
            </div>
            {state.foods.length ? state.foods.map(item => (
              <div className="my-food-row" key={item.id}>
                <div><strong>{item.name}</strong><small>每 {item.base} {item.unit} · {item.kcal} kcal</small></div>
                <button type="button" onClick={() => {
                  setCustomFoodEdit(item);setSheet("custom");
                }}>編輯</button>
                <button type="button" onClick={() => {
                  if(!window.confirm("從我的食物庫移除「" + item.name + "」？歷史飲食紀錄仍然保留。")) return;
                  if(save("移除自訂食物",draft => {
                    draft.foods = draft.foods.filter(food => food.id !== item.id);
                    draft.favoriteFoods = draft.favoriteFoods?.filter(id => id !== item.id);
                  })) notify("食物已從我的食物庫移除");
                }}>移除</button>
              </div>
            )) : <p className="muted">尚未建立自訂食物。</p>}
          </section>
          <FoodPicker
            onSelect={(f) => {
              setFood(f);
              setQuantity(0);
              setSheet("portion");
            }}
          />
          <button
            className="button secondary"
            onClick={() => {setCustomFoodEdit(null);setSheet("custom");}}
          >
            <Plus size={16} />
            新增自訂食物
          </button>
          <details className="source-details">
            <summary>食物資料來源</summary>
            <p>
              食藥署原型食物 {official.length} 項，James 食物 {master.length}{" "}
              項。每 100 g 資料為可食部分；生熟狀態依名稱與詳細資料區分。
            </p>
            <a
              href="https://data.gov.tw/dataset/8543"
              target="_blank"
              rel="noreferrer"
            >
              衛生福利部食品藥物管理署 · 食品營養成分資料集
            </a>
            <p>政府資料開放授權條款第 1 版。資料下載：2026-10-09。</p>
          </details>
        </>
      ) : (
        <>
          <div className="nutrition-datebar" aria-label="紀錄日期與日型">
            <div className="nutrition-datebar-controls">
              <button type="button" className="nutrition-date-arrow" aria-label="前一天"
                onClick={() => { setDate(addDays(selectedDate, -1)); setExpandedMeals([]); }}>‹</button>
              <button type="button" className="nutrition-date-open"
                aria-expanded={datePickerOpen} aria-label="選擇紀錄日期"
                onClick={() => setDatePickerOpen(v => !v)}>
                <CalendarDays size={18} aria-hidden="true" />
                {new Intl.DateTimeFormat("zh-TW", { month:"long", day:"numeric", weekday:"short" }).format(new Date(selectedDate + "T12:00:00"))}
              </button>
              <button type="button" className="nutrition-date-arrow" aria-label="後一天"
                disabled={selectedDate >= date}
                onClick={() => { setDate(addDays(selectedDate, 1)); setExpandedMeals([]); }}>›</button>
            </div>
            <select aria-label="日型" className="nutrition-daytype" value={day.dayType}
              onChange={(e) => {
                if(save("設定日型", (draft) => setDayType(draft, selectedDate, e.target.value as DayType))) notify();
              }}>
              {Object.entries(dayNames).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
            {datePickerOpen && <input className="nutrition-date-picker" aria-label="跳至日期" type="date"
              value={selectedDate} max={date}
              onChange={(e) => { if(e.target.value) {setDate(e.target.value);setExpandedMeals([]);setDatePickerOpen(false);} }}/>}
          </div>
          <NutritionWeek date={selectedDate} onChange={next => {setDate(next);setExpandedMeals([]);}} />
          <div className="journal-columns"><div className="journal-nutrition">
          {!inlineClose ? (
            <NutritionDashboardV3 date={selectedDate}
              onAddMeal={() => { setSlot(state.mealSlots[0]); setSheet("add"); }} />
          ) : (
            <section className="nutrition-v3-dashboard">
              <NutritionSummary date={selectedDate} variant="full" />
            </section>
          )}
          <section className="meal-list meal-list--b2" id="nutrition-meals">
            <div className="meal-list-toolbar">
              <h2>每日餐次</h2>
              <button type="button" className="text-link"
                onClick={() => setExpandedMeals(expandedMeals.length ===
                  new Set([...(state.mealSlotSnapshots?.[selectedDate] ?? state.mealSlots), ...meals.map(m => m.slot)]).size ?
                  [] : Array.from(new Set([...(state.mealSlotSnapshots?.[selectedDate] ?? state.mealSlots), ...meals.map(m => m.slot)])))}>
                {expandedMeals.length === new Set([...(state.mealSlotSnapshots?.[selectedDate] ?? state.mealSlots), ...meals.map(m => m.slot)]).size ? "全部收合" : "全部展開"}
              </button>
            </div>
            {Array.from(new Set([...(state.mealSlotSnapshots?.[selectedDate] ?? state.mealSlots), ...meals.map(m => m.slot)])).map((name) => {
              const entries = meals.filter(m => m.slot === name);
              const expanded = expandedMeals.includes(name);
              const kcal = round(entries.reduce((sum,m) => sum + m.kcal, 0));
              return (
                <section key={name} className="meal-section meal-section--b2" aria-label={name + "飲食紀錄"}>
                  <div className="meal-head meal-head--b2">
                    <button type="button" className="meal-toggle" aria-expanded={expanded}
                      aria-controls={"meal-details-" + selectedDate + "-" + encodeURIComponent(name)}
                      onClick={() => setExpandedMeals(old => old.includes(name) ? old.filter(n => n !== name) : [...old, name])}>
                      <span className="meal-heading-text"><strong>{name}</strong>
                        <small>{(["p","c","f"] as const).map(key =>
                          key.toUpperCase() + " " + round(entries.reduce((total, meal) => total + meal[key], 0)) + " g").join(" · ")}</small>
                        <small>{entries.length ? entries.length + " 項食物 · " + kcal + " kcal" : "尚無紀錄"}</small>
                      </span>
                      {expanded ? <ChevronUp size={20} aria-hidden="true"/> : <ChevronDown size={20} aria-hidden="true"/>}
                    </button>
                    <button className="meal-add-button" type="button" aria-label={"新增食物至" + name}
                      onClick={() => {setSlot(name);setLoggerTab("food");setSheet("add");}}>
                      <Plus size={21} aria-hidden="true" />
                    </button>
                  </div>
                  {expanded && <div id={"meal-details-" + selectedDate + "-" + encodeURIComponent(name)}
                    className="meal-details">
                    {entries.length ? entries.map(m => (
                      <div className="meal-entry meal-entry--b2" key={m.id}>
                        <div className="meal-entry-information">
                          <strong>{m.name}</strong>
                          <span>{m.quantity} {m.unit} · {m.kcal} kcal</span>
                        </div>
                        <details className="meal-entry-menu">
                          <summary aria-label={"管理 " + m.name + " 紀錄"}><Ellipsis size={20} aria-hidden="true"/></summary>
                          <div className="meal-entry-actions">
                            <button type="button" onClick={() => {setEdit(m);setEditAmountText(String(m.quantity));setFood(null);setSheet("manual");}}>編輯／移動餐次</button>
                            <button type="button" onClick={() => {
                              if (!window.confirm("刪除此筆飲食紀錄？其他紀錄不受影響。")) return;
                              if(save("刪除飲食", draft => {
                                draft.meals.push({...m,id:uid(),supersedes:m.id,deleted:true,createdAt:stamp()});
                                syncMealCompletion(draft,selectedDate);
                              })) notify("飲食紀錄已刪除");
                            }}>刪除此筆紀錄</button>
                          </div>
                        </details>
                      </div>
                    )) : <p className="meal-empty">這一餐尚未記錄食物</p>}
                    <div className="meal-details-actions">
                      <button type="button" className="button secondary"
                        onClick={()=>{setSlot(name);setLoggerTab("food");setSheet("add");}}>
                        <Plus size={16}/> 新增食物
                      </button>
                      <button type="button" className="button secondary" aria-label={"複製餐點至" + name}
                        onClick={()=>{setSlot(name);setLoggerTab("copy");setSheet("add");}}>複製餐點</button>
                      {state.mealSlots.includes(name) && <button type="button" className="text-link"
                        onClick={()=>{setRenameSlot(name);setSheet("rename");}}>修改餐次名稱</button>}
                    </div>
                  </div>}
                </section>
              );
            })}
          </section>
          </div>
          <section className="journal-health" aria-label="每日健康紀錄">
            <h2>每日健康紀錄</h2>
            <button type="button" onClick={() => setHealth("water")}>飲水<strong>{waterTotal(state, selectedDate)} mL</strong></button>
            <button type="button" onClick={() => setHealth("weight")} aria-label="紀錄體重">體重<strong>{dayWeight == null ? "尚無紀錄" : dayWeight + " kg"}</strong></button>
            <button type="button" onClick={() => setHealth("sleep")} aria-label="紀錄恢復狀態">恢復<strong>{recoveryCount ? recoveryCount + " 筆紀錄" : "尚無紀錄"}</strong></button>
          </section>
          </div>
          {health === "water" && <Sheet title={selectedDate + " · 新增飲水"} onClose={() => setHealth(null)}>
            <form onSubmit={event => {
              event.preventDefault();
              const ml = Number(new FormData(event.currentTarget).get("ml"));
              if (ml > 0 && ml <= 10000 && save("新增飲水", draft => {
                draft.waters.push({ id: uid(), date: selectedDate, ml, createdAt: stamp() });
              })) setHealth(null);
            }}>
              <Field label="飲水量 mL"><input required autoFocus name="ml" type="number" min="1" max="10000" /></Field>
              <button className="button">儲存</button>
            </form>
          </Sheet>}
          {(health === "sleep" || health === "weight") && <RecoveryQuickLog date={selectedDate}
            initialKind={health} notify={notify} close={() => setHealth(null)} />}
          <Link className="nutrition-manage-link" href="/nutrition/foods">管理我的食物</Link>
          {inlineClose && (
            <button className="button add-meal" onClick={() => { setSlot(state.mealSlots[0]); setSheet("add"); }}>
              <Plus size={18} /> 新增飲食
            </button>
          )}
        </>
      )}
      {sheet === "rename" && (
        <MealNameQuickEdit
          name={renameSlot}
          onClose={close}
          onSave={(raw) => {
            const next = raw.trim();
            if (!next || state.mealSlots.some(n =>
              n !== renameSlot && n.toLocaleLowerCase() === next.toLocaleLowerCase())) {
              notify("餐次不可空白或重複");
              return;
            }
            if (next === renameSlot) { close(); return; }
            if (save("更新餐次名稱", draft => {
              const today = dateInZone(draft.profile?.timezone);
              draft.mealSlots = draft.mealSlots.map(n => n === renameSlot ? next : n);
              // Keep historic meals intact; use successor entries for today/future.
              const visible = draft.meals.filter(m =>
                !m.deleted && m.slot === renameSlot && m.date >= today &&
                !draft.meals.some(n => n.supersedes === m.id));
              for (const m of visible) draft.meals.push({
                ...m, id: uid(), slot: next, createdAt: stamp(), supersedes: m.id,
              });
              for (const day of Object.keys(draft.mealSlotSnapshots ?? {})) {
                if (day >= today) draft.mealSlotSnapshots![day] =
                  draft.mealSlotSnapshots![day].map(n => n === renameSlot ? next : n);
              }
              for (const item of draft.skippedMealSlots ?? []) {
                if (item.date >= today && item.slot === renameSlot) item.slot = next;
              }
            })) {
              setSlot(next);
              close();
              notify("餐次名稱已更新");
            }
          }}
        />
      )}
      {sheet && sheet !== "rename" && (
        <Sheet
          title={
            {
              meal: "加入哪一餐",
              myfood: "My Foods",
              add: `${slot} · 新增飲食`,
              manual: edit ? "修正飲食" : "Quick Macro",
              food: "選擇食物",
              portion: food?.name ?? "食用份量",
              custom: customFoodEdit ? "編輯我的食物" : "新增自訂食物",
            }[sheet]
          }
          onClose={close}
          mode={sheet === "add" ? "nutrition-logger" : "standard"}
        >
          {sheet === "meal" ? (
            <div className="action-list">
              {state.mealSlots.map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    setSlot(n);
                    setSheet("add");
                  }}
                >
                  {n}
                  <ChevronRight />
                </button>
              ))}
            </div>
          ) : sheet === "add" ? (
            <FoodLogger date={selectedDate} slot={slot} onSlot={setSlot} initialTab={loggerTab}
              onDirty={setLoggerDirty} onDone={()=>{setLoggerDirty(false);setLoggerTab("food");setSheet(null);setExpandedMeals(old=>old.includes(slot)?old:[...old,slot]);inlineClose?.();notify("已加入飲食紀錄");}} />
          ) : sheet === "food" || sheet === "myfood" ? (
            <>
              <button className="text-link" onClick={() => setSheet("add")}>
                ← {slot}
              </button>
              {(sheet === "myfood" || sheet === "food") && (
                <button
                  className="button secondary"
                  onClick={() => setSheet("custom")}
                >
                  新增自訂食物
                </button>
              )}
              <FoodPicker
                mine={sheet === "myfood"}
                onSelect={(f) => {
                  setFood(f);
                  setQuantity(0);
                  setSheet("portion");
                }}
              />
            </>
          ) : sheet === "custom" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const d = new FormData(e.currentTarget);
                const p = Number(d.get("p")),
                  c = Number(d.get("c")),
                  f = Number(d.get("f"));
                const input = {
                  name: String(d.get("name")).trim(),
                  nameEn: String(d.get("nameEn")).trim(),
                  category: String(d.get("category")),
                  base: 100,
                  unit: "g",
                  p, c, f, kcal: round(p * 4 + c * 4 + f * 9),
                  source: "User",
                };
                if(!input.name || [p,c,f].some(value => !Number.isFinite(value) || value < 0 || value > 100)) {
                  notify("請輸入有效的食物名稱與每 100 g 營養素");
                  return;
                }
                if (save(customFoodEdit ? "修改自訂食物" : "新增自訂食物", (draft) => {
                  if(customFoodEdit) {
                    draft.foods = draft.foods.map(item => item.id === customFoodEdit.id ?
                      {...item, ...input, version:item.version + 1} : item);
                  } else {
                    draft.foods.push({...input,id:uid(),version:1});
                  }
                })) {
                  notify();
                  close();
                }
              }}
            >
              <Field label="中文名稱">
                <input name="name" required maxLength={80} defaultValue={customFoodEdit?.name} />
              </Field>
              <Field label="English name（選填）">
                <input name="nameEn" maxLength={100} defaultValue={customFoodEdit?.nameEn} />
              </Field>
              <Field label="分類">
                <select name="category" defaultValue={customFoodEdit?.category ?? categories[0]}>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <p>每 100 g</p>
              <div className="form-grid">
                <Num label="蛋白質 g" name="p" value={customFoodEdit?.p} max={100} />
                <Num label="碳水 g" name="c" value={customFoodEdit?.c} max={100} />
                <Num label="脂肪 g" name="f" value={customFoodEdit?.f} max={100} />
              </div>
              <button className="button">{customFoodEdit ? "保存修改" : "保存食物"}</button>
            </form>
          ) : (
            <form onSubmit={log}>
              <Field label="餐次">
                <select name="slot" defaultValue={edit?.slot ?? slot}>
                  {state.mealSlots.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              {food ? (
                <>
                  <p lang="en" className="muted">
                    {food.nameEn}
                  </p>
                  <Field label={`食用量 ${food.unit}`}>
                    <input
                      type="number"
                      min="0.1"
                      max="10000"
                      step="0.1"
                      required
                      value={quantity || ""}
                      placeholder={`輸入實際食用量（例如 ${food.base}）`}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                    />
                  </Field>
                  <div className="form-grid">
                    {(["p", "c", "f"] as const).filter(key => food[key] > 0).map((key) => (
                      <Field
                        key={key}
                        label={`${{p:"蛋白質",c:"碳水",f:"脂肪"}[key]} g`}
                      >
                        <input
                          type="number"
                          min="0"
                          max="1000"
                          step="0.1"
                          value={quantity > 0 ? round((food[key] * quantity) / food.base) : ""}
                          placeholder="可反推食物份量"
                          onChange={(e) =>
                            setQuantity(
                              round(
                                (Number(e.target.value) * food.base) /
                                  food[key],
                              ),
                            )
                          }
                        />
                      </Field>
                    ))}
                  </div>
                  {quantity > 0 && <div className="portion-preview">
                    P {round((food.p * quantity) / food.base)} · C{" "}
                    {round((food.c * quantity) / food.base)} · F{" "}
                    {round((food.f * quantity) / food.base)}
                    <br />{round((food.kcal * quantity) / food.base)} kcal
                  </div>}

                </>
              ) : edit ? (
                <div className="stack">
                  <Field label={"食用重量（" + edit.unit + "）"}>
                    <input type="number" min="0.1" max="10000" step="any"
                      aria-label="修改食用重量" value={editAmountText}
                      onChange={event => setEditAmountText(event.target.value)}/>
                  </Field>
                  <Field label="食物名稱">
                    <input name="name" required maxLength={80} defaultValue={edit.name}/>
                  </Field>
                  <div className="logger-edit-summary">
                    <strong>{Number(editAmountText) > 0 ?
                      round(edit.kcal * Number(editAmountText) / edit.quantity) : "—"} kcal</strong>
                    <span>蛋白質 {Number(editAmountText) > 0 ? round(edit.p * Number(editAmountText) / edit.quantity) : "—"} g</span>
                    <span>碳水 {Number(editAmountText) > 0 ? round(edit.c * Number(editAmountText) / edit.quantity) : "—"} g</span>
                    <span>脂肪 {Number(editAmountText) > 0 ? round(edit.f * Number(editAmountText) / edit.quantity) : "—"} g</span>
                  </div>
                </div>
              ) : (
                <>
                  <Field label="這餐吃了什麼">
                    <input name="name" required maxLength={80}/>
                  </Field>
                  <div className="form-grid">
                    <Num label="蛋白質 g" name="p" max={1000} />
                    <Num label="碳水 g" name="c" max={1000} />
                    <Num label="脂肪 g" name="f" max={1000} />
                  </div>
                </>
              )}
              {mealError && <p role="alert" className="notice error">{mealError}</p>}
              <button className="button">
                {edit ? "保存修正" : "加入紀錄"}
              </button>
              {edit && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    if (
                      save("刪除飲食", (s) =>
                        s.meals.push({
                          ...edit,
                          id: uid(),
                          supersedes: edit.id,
                          deleted: true,
                          createdAt: stamp(),
                        }),
                      )
                    ) {
                      notify();
                      close();
                    }
                  }}
                >
                  刪除這筆紀錄
                </button>
              )}
            </form>
          )}
        </Sheet>
      )}
    </div>
  );
}
