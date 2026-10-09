"use client";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Droplet,
  Dumbbell,
  Ellipsis,
  Plus,
  Utensils,
  X,
  Undo2,
  Activity,
  Heart,
  Search,
  BookOpen,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  activePlan,
  dayNames,
  mealTotals,
  resolveDay,
  visibleMeals,
  waterTotal,
  pinDay,
  setDayType,
  round,
  type DayType,
  type Food,
  type Meal,
} from "@/lib/domain";
import master from "@/content/foods.json";
import official from "@/content/fda-foods.json";
export const uid = () => crypto.randomUUID();
export const stamp = () => new Date().toISOString();
export function Sheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    const prev = document.activeElement as HTMLElement;
    return () => {
      el?.close();
      prev?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="sheet"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet-body">
        <header>
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="關閉">
            <X />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
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
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="simple-heading">
      <h1>{title}</h1>
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
export type PetState = "idle" | "training" | "resting" | "drinking" | "reading";
export function Companion({
  state,
  onTap,
}: {
  state: PetState;
  onTap: () => void;
}) {
  return (
    <button
      className={`companion pet-${state}`}
      onClick={onTap}
      aria-label={`電子寵物：${{ idle: "待機", training: "訓練", resting: "休息", drinking: "喝水", reading: "閱讀" }[state]}`}
    >
      <svg viewBox="0 0 200 180" role="img" aria-label="James 電子寵物">
        <ellipse cx="100" cy="161" rx="44" ry="7" fill="#000" opacity=".13" />
        <g className="pet-body">
          <path
            d="M67 76 Q57 90 62 118 Q64 141 100 142 Q137 141 139 118 Q144 92 132 76"
            fill="#dededc"
            stroke="#222"
            strokeWidth="2"
          />
          <rect
            x="58"
            y="28"
            width="84"
            height="69"
            rx="29"
            fill="#f8f8f6"
            stroke="#222"
            strokeWidth="2"
          />
          <path
            d="M72 34 L67 13 Q78 9 83 29 M119 29 Q125 8 135 14 L129 35"
            fill="#f8f8f6"
            stroke="#222"
            strokeWidth="2"
          />
          <rect x="71" y="47" width="58" height="31" rx="13" fill="#202020" />
          <g className="pet-eyes">
            <circle cx="86" cy="61" r="4" fill="#d4b66e" />
            <circle cx="113" cy="61" r="4" fill="#d4b66e" />
          </g>
          <path
            d="M94 72 Q100 77 106 72"
            fill="none"
            stroke="#d4b66e"
            strokeWidth="2"
          />
          <path
            d="M76 138 L74 151 M123 138 L126 151"
            stroke="#222"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            className="pet-arm"
            d="M137 100 L151 114"
            stroke="#222"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M63 100 L50 112"
            stroke="#222"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M95 107 L105 107 L101 122 L91 122"
            fill="none"
            stroke="#a58b50"
            strokeWidth="4"
          />
          {state === "drinking" && (
            <path d="M142 104 H160 L157 126 H145 Z" fill="#d4b66e" />
          )}
          {state === "training" && (
            <g stroke="#a58b50" strokeWidth="6">
              <path d="M138 111 H167 M138 103 V119 M166 103 V119" />
            </g>
          )}
          {state === "reading" && (
            <path
              d="M75 114 Q89 110 100 117 Q114 110 126 114 V136 Q113 132 100 139 Q87 132 75 136Z"
              fill="#d4b66e"
              stroke="#222"
              strokeWidth="2"
            />
          )}
          {state === "resting" && (
            <text x="148" y="44" fontSize="18" fill="#999">
              z
            </text>
          )}
        </g>
      </svg>
    </button>
  );
}
export function NutritionSummary({ date }: { date: string }) {
  const { state } = useStore();
  const d = resolveDay(state, date);
  const meals = visibleMeals(state, date);
  const total = mealTotals(state, date);
  const recorded = meals.length > 0 || d.complete;
  return (
    <>
      <div className="macro-summary">
        {(["p", "c", "f"] as const).map((key, i) => (
          <div key={key}>
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
export function TodayV2({
  date,
  notify,
}: {
  date: string;
  notify: (s?: string) => void;
}) {
  const { state, save } = useStore();
  const [pet, setPet] = useState<PetState>("idle");
  const [adjust, setAdjust] = useState(false);
  const current = state.sessions.find((s) => s.status === "in_progress");
  const cycle = state.cycles?.at(-1);
  const completed = cycle
    ? (state.cycleEvents?.filter(
        (e) =>
          e.cycleId === cycle.id && ["completed", "skipped"].includes(e.type),
      ).length ?? 0)
    : 0;
  const day = cycle?.days[completed % (cycle?.days.length || 1)];
  const rec = state.recommendations.find((r) => r.status === "pending");
  const target = resolveDay(state, date).target;
  const recovery = state.recoveries.filter((r) => r.date === date).at(-1);
  const water = waterTotal(state, date);
  const hasWater = state.waters.some((w) => w.date === date);
  useEffect(() => {
    if (pet === "idle") return;
    const t = setTimeout(() => setPet("idle"), 2200);
    return () => clearTimeout(t);
  }, [pet]);
  function add(ml: number) {
    if (
      save("新增飲水", (s) =>
        s.waters.push({ id: uid(), date, ml, createdAt: stamp() }),
      )
    ) {
      setPet("drinking");
      notify();
    }
  }
  return (
    <div className="daily-page">
      <PageTitle title="Today">
        <span className="muted">{date.slice(5).replace("-", " / ")}</span>
      </PageTitle>
      <section className="companion-stage">
        <Companion
          state={
            pet === "idle" && current
              ? "training"
              : pet === "idle" && resolveDay(state, date).dayType === "rest"
                ? "resting"
                : pet
          }
          onTap={() => setPet(pet === "reading" ? "idle" : "reading")}
        />
        <Link
          className="primary-reminder"
          href={
            rec
              ? "/progress/recommendations"
              : !target
                ? "/onboarding"
                : current
                  ? "/training/session"
                  : "/nutrition"
          }
        >
          <span>
            {rec
              ? "有 1 項營養調整待確認"
              : !target
                ? state.profile?.goal === "GAIN"
                  ? "GAIN · 基準紀錄中"
                  : "尚未設定營養目標"
                : current
                  ? `訓練進行中 · ${current.name}`
                  : "今日營養目標已設定"}
          </span>
          <ChevronRight size={16} />
        </Link>
      </section>
      <section className="card">
        <div className="card-head">
          <h2>
            <Utensils size={19} />
            Nutrition
          </h2>
          <Link href="/nutrition" aria-label="開啟營養">
            <ChevronRight />
          </Link>
        </div>
        <NutritionSummary date={date} />
        <Link className="button" href="/nutrition/log">
          <Plus size={16} />
          記錄飲食
        </Link>
      </section>
      <section className="card">
        <div className="card-head">
          <h2>
            <Dumbbell size={19} />
            Training
          </h2>
          <Link href="/training" aria-label="開啟訓練">
            <ChevronRight />
          </Link>
        </div>
        <p className="today-training">
          {current?.name ??
            (day
              ? `Day ${(completed % cycle!.days.length) + 1} · ${day.name}`
              : "尚未設定 Cycle")}
        </p>
        <Link
          className="button secondary"
          href={current ? "/training/session" : "/training"}
        >
          {current ? "繼續訓練" : day ? "開始訓練" : "設定訓練"}
          <ArrowRight size={16} />
        </Link>
      </section>
      <section className="card">
        <div className="card-head">
          <h2>
            <Droplet size={19} />
            Water
          </h2>
          <button
            className="icon-button"
            aria-label="修正飲水"
            onClick={() => setAdjust(true)}
          >
            <Undo2 size={19} />
          </button>
        </div>
        <p className="water-number">
          {hasWater ? round(water / 1000, 2) : "尚未紀錄"}{" "}
          <small>
            /{" "}
            {state.profile?.waterTarget
              ? round(state.profile.waterTarget / 1000, 2)
              : "—"}{" "}
            L
          </small>
        </p>
        <div className="two-actions">
          <button className="button secondary" onClick={() => add(250)}>
            +250 ml
          </button>
          <button className="button secondary" onClick={() => add(500)}>
            +500 ml
          </button>
        </div>
      </section>
      <section className="card">
        <div className="card-head">
          <h2>
            <Heart size={19} />
            Recovery
          </h2>
          <Link href="/progress/recovery" aria-label="記錄恢復">
            <Plus />
          </Link>
        </div>
        <div className="recovery-values">
          <div>
            <strong>{recovery ? `${recovery.sleep} h` : "尚未紀錄"}</strong>
            <span>睡眠</span>
          </div>
          <div>
            <strong>{recovery ? `${recovery.fatigue} / 5` : "尚未紀錄"}</strong>
            <span>疲勞</span>
          </div>
        </div>
      </section>
      {adjust && (
        <Sheet title="修正飲水" onClose={() => setAdjust(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const ml = Number(new FormData(e.currentTarget).get("ml"));
              if (
                save("修正飲水總量", (s) =>
                  s.waters.push({
                    id: uid(),
                    date,
                    ml: ml - waterTotal(s, date),
                    createdAt: stamp(),
                  }),
                )
              ) {
                notify();
                setAdjust(false);
              }
            }}
          >
            <Num name="ml" label="今日總飲水量 ml" value={water} step="50" />
            <button className="button">保存修正</button>
          </form>
        </Sheet>
      )}
    </div>
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
}: {
  onSelect: (f: LibraryFood) => void;
}) {
  const { state } = useStore();
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [limit, setLimit] = useState(30);
  const foods = [...master, ...official, ...state.foods] as LibraryFood[];
  const filtered = foods.filter(
    (f) =>
      f.category === category &&
      (source === "all" || f.source === source) &&
      `${f.name} ${f.nameEn ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="food-picker">
      <Field label="食物分類">
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setLimit(30);
          }}
        >
          <option value="">先選擇分類</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      {category && (
        <>
          <div className="food-filter">
            <Field label="搜尋食物">
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setLimit(30);
                }}
                placeholder="中文或 English"
              />
            </Field>
            <Field label="來源">
              <select
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  setLimit(30);
                }}
              >
                <option value="all">所有來源</option>
                <option value="TFDA">食藥署原型食物</option>
                <option value="James Master">James 食物</option>
              </select>
            </Field>
          </div>
          <p className="muted food-count">{filtered.length} 項</p>
          <ul className="food-list">
            {filtered.slice(0, limit).map((f) => (
              <li key={f.id}>
                <button onClick={() => onSelect(f)}>
                  <div>
                    <strong>{f.name}</strong>
                    <small lang="en">{f.nameEn}</small>
                    <span>
                      {f.base} {f.unit} · {f.kcal} kcal
                    </span>
                  </div>
                  <ChevronRight size={18} />
                </button>
              </li>
            ))}
          </ul>
          {!filtered.length && <p className="empty">找不到符合的食物</p>}
          {filtered.length > limit && (
            <button
              className="button secondary"
              onClick={() => setLimit(limit + 30)}
            >
              顯示更多
            </button>
          )}
        </>
      )}
    </div>
  );
}
export function NutritionV2({
  path,
  date,
  notify,
}: {
  path: string;
  date: string;
  notify: (s?: string) => void;
}) {
  const { state, save } = useStore();
  const [selectedDate, setDate] = useState(date);
  const [sheet, setSheet] = useState<
    "add" | "manual" | "food" | "portion" | "custom" | null
  >(path === "nutrition/log" ? "add" : null);
  const [food, setFood] = useState<LibraryFood | null>(null);
  const [edit, setEdit] = useState<Meal | null>(null);
  const [slot, setSlot] = useState(state.mealSlots[0]);
  const [quantity, setQuantity] = useState(100);
  const day = resolveDay(state, selectedDate);
  const meals = visibleMeals(state, selectedDate);
  const isLibrary = path === "nutrition/foods";
  function close() {
    setSheet(null);
    setEdit(null);
    setFood(null);
  }
  function log(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const factor = food ? quantity / food.base : 1;
    const p = round(food ? food.p * factor : Number(d.get("p"))),
      c = round(food ? food.c * factor : Number(d.get("c"))),
      f = round(food ? food.f * factor : Number(d.get("f")));
    if (
      save(edit ? "修正飲食" : "新增飲食", (s) => {
        pinDay(s, selectedDate);
        s.meals.push({
          id: uid(),
          date: selectedDate,
          slot: String(d.get("slot")),
          name: food?.name ?? String(d.get("name")),
          quantity: food ? quantity : 1,
          unit: food?.unit ?? "份",
          p,
          c,
          f,
          kcal: round(food ? food.kcal * factor : p * 4 + c * 4 + f * 9),
          foodId: food?.id,
          foodVersion: food?.version,
          createdAt: stamp(),
          ...(edit ? { supersedes: edit.id } : {}),
        });
      })
    ) {
      notify();
      close();
    }
  }
  return (
    <div className="daily-page">
      <PageTitle title={isLibrary ? "食物庫" : "Nutrition"}>
        <Menu
          items={[
            ["/nutrition/plan", "營養計畫"],
            ["/nutrition/foods", "食物庫"],
            ["/nutrition/recipes", "食譜"],
            ["/progress/history", "計畫紀錄"],
          ]}
        />
      </PageTitle>
      {isLibrary ? (
        <>
          <FoodPicker
            onSelect={(f) => {
              setFood(f);
              setQuantity(f.base);
              setSheet("portion");
            }}
          />
          <button
            className="button secondary"
            onClick={() => setSheet("custom")}
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
          <div className="date-type">
            <input
              aria-label="紀錄日期"
              type="date"
              value={selectedDate}
              max={date}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
            />
            <select
              aria-label="日型"
              value={day.dayType}
              onChange={(e) => {
                if (
                  save("設定日型", (s) =>
                    setDayType(s, selectedDate, e.target.value as DayType),
                  )
                )
                  notify();
              }}
            >
              {Object.entries(dayNames).map(([k, n]) => (
                <option key={k} value={k}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <section className="card">
            <NutritionSummary date={selectedDate} />
          </section>
          <section className="meal-list">
            {state.mealSlots.map((name) => (
              <div key={name} className="meal-section">
                <div className="meal-head">
                  <h2>{name}</h2>
                  <button
                    className="icon-button"
                    aria-label={`新增${name}`}
                    onClick={() => {
                      setSlot(name);
                      setSheet("add");
                    }}
                  >
                    <Plus size={20} />
                  </button>
                </div>
                {meals.filter((m) => m.slot === name).length ? (
                  meals
                    .filter((m) => m.slot === name)
                    .map((m) => (
                      <div className="meal-entry" key={m.id}>
                        <div>
                          <h3>{m.name}</h3>
                          <p>
                            {m.quantity} {m.unit} · {m.kcal} kcal
                          </p>
                          <small>
                            P {m.p} C {m.c} F {m.f}
                          </small>
                        </div>
                        <button
                          className="text-link"
                          onClick={() => {
                            setEdit(m);
                            setFood(null);
                            setSheet("manual");
                          }}
                        >
                          修正
                        </button>
                      </div>
                    ))
                ) : (
                  <p className="muted">尚未紀錄</p>
                )}
              </div>
            ))}
          </section>
          <button className="button add-meal" onClick={() => setSheet("add")}>
            <Plus size={18} />
            新增飲食
          </button>
          <label className="check">
            <input
              type="checkbox"
              checked={day.complete}
              onChange={(e) => {
                const complete = e.target.checked;
                save("設定飲食紀錄完整度", (s) => {
                  pinDay(s, selectedDate);
                  s.days.find((d) => d.date === selectedDate)!.complete =
                    complete;
                });
              }}
            />
            今日飲食已記錄完整
          </label>
        </>
      )}
      {sheet && (
        <Sheet
          title={
            {
              add: "新增飲食",
              manual: edit ? "修正飲食" : "直接輸入",
              food: "選擇食物",
              portion: food?.name ?? "食用份量",
              custom: "新增自訂食物",
            }[sheet]
          }
          onClose={close}
        >
          {sheet === "add" ? (
            <div className="action-list">
              <button onClick={() => setSheet("food")}>
                <Utensils />
                從食物庫選擇
                <ChevronRight />
              </button>
              <button
                onClick={() => {
                  setFood(null);
                  setSheet("manual");
                }}
              >
                <Plus />
                直接輸入 P / C / F<ChevronRight />
              </button>
              <Link href="/nutrition/recipes">
                <BookOpen />
                食譜
                <ChevronRight />
              </Link>
            </div>
          ) : sheet === "food" ? (
            <FoodPicker
              onSelect={(f) => {
                setFood(f);
                setQuantity(f.base);
                setSheet("portion");
              }}
            />
          ) : sheet === "custom" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const d = new FormData(e.currentTarget);
                const p = Number(d.get("p")),
                  c = Number(d.get("c")),
                  f = Number(d.get("f"));
                if (
                  save("新增自訂食物", (s) =>
                    s.foods.push({
                      id: uid(),
                      name: String(d.get("name")),
                      nameEn: String(d.get("nameEn")),
                      category: String(d.get("category")),
                      base: 100,
                      unit: "g",
                      p,
                      c,
                      f,
                      kcal: round(p * 4 + c * 4 + f * 9),
                      source: "User",
                      version: 1,
                    }),
                  )
                ) {
                  notify();
                  close();
                }
              }}
            >
              <Field label="中文名稱">
                <input name="name" required maxLength={80} />
              </Field>
              <Field label="English name（選填）">
                <input name="nameEn" maxLength={100} />
              </Field>
              <Field label="分類">
                <select name="category">
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <p>每 100 g</p>
              <div className="form-grid">
                <Num label="蛋白質 g" name="p" max={100} />
                <Num label="碳水 g" name="c" max={100} />
                <Num label="脂肪 g" name="f" max={100} />
              </div>
              <button className="button">保存食物</button>
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
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                    />
                  </Field>
                  <div className="portion-preview">
                    P {round((food.p * quantity) / food.base)} · C{" "}
                    {round((food.c * quantity) / food.base)} · F{" "}
                    {round((food.f * quantity) / food.base)}
                    <br />
                    {round((food.kcal * quantity) / food.base)} kcal
                  </div>
                  <details className="source-details">
                    <summary>食物詳細資料</summary>
                    <p>
                      {food.source === "TFDA"
                        ? "食藥署 · 每 100 g 可食部分"
                        : "James 食物 · 依標示份量"}
                    </p>
                    <p>{food.sourceDescription}</p>
                    {food.sourceUrl && (
                      <a href={food.sourceUrl} target="_blank" rel="noreferrer">
                        官方資料來源
                      </a>
                    )}
                  </details>
                </>
              ) : (
                <>
                  <Field label="這餐吃了什麼">
                    <input
                      name="name"
                      required
                      maxLength={80}
                      defaultValue={edit?.name}
                    />
                  </Field>
                  <div className="form-grid">
                    <Num label="蛋白質 g" name="p" value={edit?.p} />
                    <Num label="碳水 g" name="c" value={edit?.c} />
                    <Num label="脂肪 g" name="f" value={edit?.f} />
                  </div>
                </>
              )}
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
