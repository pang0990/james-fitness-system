"use client";
import Link from "next/link";
import { RecoveryQuickLog, RecoveryEntryPoints } from "./recovery-log";
import { latestRecovery } from "@/lib/recovery";
import { nextDayIndex } from "@/lib/training-queue";
import { Companion, type CompanionState as PetState } from "./companion";
import { NoticeCarousel } from "./notices";
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
  dateInZone,
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
import { activeCycle, scheduleKind } from "@/lib/training-model";
import master from "@/content/foods.json";
import cooked from "@/content/cooked-foods.json";
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
export function TodayV2({
  date,
  notify,
}: {
  date: string;
  notify: (s?: string) => void;
}) {
  const { state, save } = useStore();
  const [pet, setPet] = useState<PetState>(() =>
    state.sessions.some(
      (s) =>
        s.date === date &&
        s.completedAt &&
        Date.now() - Date.parse(s.completedAt) < 60000,
    )
      ? "celebrating"
      : "idle",
  );
  const [adjust, setAdjust] = useState(false);
  const [quickFood, setQuickFood] = useState(false);
  const [quickDate, setQuickDate] = useState<string | null>(null);
  const current = state.sessions.find((s) => s.status === "in_progress");
  const cycle = activeCycle(state);
  const completed = cycle
    ? (state.cycleEvents?.filter(
        (e) =>
          e.cycleId === cycle.id && ["completed", "skipped"].includes(e.type),
      ).length ?? 0)
    : 0;
  const day = cycle?.days[Math.max(0, nextDayIndex(state, cycle))];
  const rec = state.recommendations.find((r) => r.status === "pending");
  const target = resolveDay(state, date).target;
  const latest = latestRecovery(state, date);
  const sleep = latest.find((r) => r.type === "sleep");
  const fatigue = latest.find((r) => r.type === "fatigue");
  const recovery =
    sleep || fatigue
      ? {
          sleep: sleep ? Math.round((sleep.value / 60) * 10) / 10 : null,
          fatigue: fatigue?.value ?? null,
        }
      : null;
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
      <section className="cinematic-hero" aria-label="今日進度與角色視覺">
        <div className="cinematic-hero-heading">
          <div>
            <span className="cinematic-kicker">GOOD MORNING</span>
            <strong className="cinematic-name">{state.profile?.name || "WANDERER"}</strong>
          </div>
          <div className="cinematic-day-label"><small>CYCLE DAY</small><b>{cycle ? completed + 1 : "—"}</b></div>
        </div>
        <div className="cinematic-character-control">
          <button type="button" onClick={() => setPet(pet === "reading" ? "idle" : "reading")} className="cinematic-tap">◇ TAP TO INTERACT</button>
          <span>{pet === "reading" ? "TURN AROUND · 轉身" : pet === "drinking" ? "DRINKING · 喝水" : pet === "celebrating" ? "CELEBRATE · 慶祝" : "WALKING · 行走"}</span>
        </div>
        <div className="cinematic-marquee">
          <span className="cinematic-kicker">✦ TODAY ACTION QUEUE</span>
          <NoticeCarousel date={date} onLog={setQuickDate} />
        </div>
        {quickDate && (
          <RecoveryQuickLog
            date={quickDate}
            close={() => setQuickDate(null)}
            notify={notify}
          />
        )}
      </section>
      <section className="card">
        <div className="card-head">
          <h2>
            <Dumbbell size={19} />
            TRAIN
          </h2>
          <Link href="/training" aria-label="開啟訓練">
            <ChevronRight />
          </Link>
        </div>
        <p className="today-training">
          {current?.name ?? (day ? day.name : "尚未設定 Training Plan")}
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
            <Utensils size={19} />
            EAT
          </h2>
          <Link href="/nutrition" aria-label="開啟營養">
            <ChevronRight />
          </Link>
        </div>
        <NutritionSummary date={date} />
        <button className="button" onClick={() => setQuickFood(true)}>
          <Plus size={16} />
          記錄飲食
        </button>
        {quickFood && (
          <NutritionV2
            path="nutrition/log"
            date={date}
            notify={notify}
            inlineClose={() => setQuickFood(false)}
          />
        )}
      </section>
      <section className="daily-status">
        <p className="eyebrow">DAILY STATUS</p>
        <div className="daily-status-block">
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
            <button
              className="button secondary"
              onClick={() => add(Number(state.preferences?.waterQuick1 ?? 250))}
            >
              +{Number(state.preferences?.waterQuick1 ?? 250)} ml
            </button>
            <button
              className="button secondary"
              onClick={() => add(Number(state.preferences?.waterQuick2 ?? 500))}
            >
              +{Number(state.preferences?.waterQuick2 ?? 500)} ml
            </button>
          </div>
        </div>
        <div className="daily-status-block">
          <div className="card-head">
            <h2>
              <Heart size={19} />
              Recovery
            </h2>
            <button onClick={() => setQuickDate(date)} aria-label="記錄恢復">
              <Plus />
            </button>
          </div>
          <RecoveryEntryPoints date={date} />
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
  mine = false,
}: {
  mine?: boolean;
  onSelect: (f: LibraryFood) => void;
}) {
  const { state, save } = useStore();
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [limit, setLimit] = useState(30);
  const foods = (
    mine ? state.foods : [...master, ...cooked, ...official, ...state.foods]
  ) as LibraryFood[];
  const counts = new Map<string, number>(),
    recent = new Map<string, string>();
  for (const m of state.meals) {
    if (m.foodId) {
      counts.set(m.foodId, (counts.get(m.foodId) ?? 0) + 1);
      recent.set(m.foodId, m.createdAt);
    }
  }
  const filtered = foods.filter(
    (f) =>
      (source === "all" ||
        (source === "favorites" && state.favoriteFoods?.includes(f.id)) ||
        (["recent", "frequent"].includes(source) && counts.has(f.id))) &&
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
  return (
    <div className="food-picker">
      <Field label="食物清單">
        <select value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="all">所有食物</option>
          <option value="recent">Recent · 最近</option>
          <option value="favorites">Favorites · 收藏</option>
          <option value="frequent">Frequent · 常吃</option>
        </select>
      </Field>
      <Field label="食物分類">
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setLimit(30);
          }}
        >
          <option value="">所有分類</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      {true && (
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
          </div>
          <p className="muted food-count">{filtered.length} 項</p>
          <ul className="food-list">
            {filtered.slice(0, limit).map((f) => (
              <li key={f.id} className="food-with-favorite">
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
                <button
                  className="favorite-food"
                  aria-label={`${state.favoriteFoods?.includes(f.id) ? "取消收藏" : "收藏"} ${f.name}`}
                  aria-pressed={state.favoriteFoods?.includes(f.id) ?? false}
                  onClick={() =>
                    save("更新收藏食物", (s) => {
                      s.favoriteFoods = s.favoriteFoods?.includes(f.id)
                        ? s.favoriteFoods.filter((id) => id !== f.id)
                        : [...(s.favoriteFoods ?? []), f.id];
                    })
                  }
                >
                  {state.favoriteFoods?.includes(f.id) ? "已收藏" : "收藏"}
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
  inlineClose,
}: {
  inlineClose?: () => void;
  path: string;
  date: string;
  notify: (s?: string) => void;
}) {
  const { state, save } = useStore();
  const [selectedDate, setDate] = useState(date);
  const [sheet, setSheet] = useState<
    | "meal"
    | "slots"
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
  const [quantity, setQuantity] = useState(100);
  const [slotText, setSlotText] = useState(state.mealSlots.join("\n"));
  const [renameSlot, setRenameSlot] = useState("");
  const day = resolveDay(state, selectedDate);
  const meals = visibleMeals(state, selectedDate);
  const isLibrary = path === "nutrition/foods";
  function close() {
    inlineClose?.();
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
    <div className={inlineClose ? "inline-nutrition" : "daily-page"}>
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
            {Array.from(
              new Set([...state.mealSlots, ...meals.map((m) => m.slot)]),
            ).map((name) => (
              <div key={name} className="meal-section">
                <div className="meal-head">
                  <h2>{name}</h2>
                  <div className="cinematic-meal-actions">
                    {state.mealSlots.includes(name) && (
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`重新命名${name}`}
                        onClick={() => { setRenameSlot(name); setSheet("rename"); }}
                      >
                        <Ellipsis size={18} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`新增食物至${name}`}
                      onClick={() => { setSlot(name); setSheet("add"); }}
                    >
                      <Plus size={20} />
                    </button>
                  </div>
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
          <button className="button add-meal" onClick={() => { setSlot(state.mealSlots[0]); setSheet("add"); }}>
            <Plus size={18} />
            新增飲食
          </button>
          <Link className="text-link" href="/nutrition/meals">
            編輯餐次
          </Link>
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
              meal: "加入哪一餐",
              slots: "編輯每日餐次",
              rename: "重新命名餐次",
              myfood: "My Foods",
              add: `${slot} · 新增飲食`,
              manual: edit ? "修正飲食" : "Quick Macro",
              food: "選擇食物",
              portion: food?.name ?? "食用份量",
              custom: "新增自訂食物",
            }[sheet]
          }
          onClose={close}
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
              <button onClick={() => setSheet("slots")}>編輯餐次</button>
            </div>
          ) : sheet === "rename" ? (
            <form onSubmit={(e) => {
              e.preventDefault();
              const next = String(new FormData(e.currentTarget).get("name") ?? "").trim();
              if (!next || (state.mealSlots.some(n => n !== renameSlot && n.toLowerCase() === next.toLowerCase()))) {
                notify("餐次不可空白或重複");
                return;
              }
              if (next === renameSlot) { close(); return; }
              if (save("重新命名餐次", (draft) => {
                const today = dateInZone(draft.profile?.timezone);
                draft.mealSlots = draft.mealSlots.map(n => n === renameSlot ? next : n);
                // Keep old meal snapshots unchanged; only current / future entries get successor snapshots.
                const visible = draft.meals.filter(m => !m.deleted && m.slot === renameSlot && m.date >= today && !draft.meals.some(n => n.supersedes === m.id));
                for (const m of visible) draft.meals.push({ ...m, id: uid(), slot: next, createdAt: stamp(), supersedes: m.id });
              })) {
                setSlot(next); setRenameSlot(next); setSlotText(state.mealSlots.map(n => n === renameSlot ? next : n).join("\n"));
                close(); notify("餐次名稱已更新，歷史紀錄保留");
              }
            }}>
              <p className="muted">此名稱套用今天及未來；過去日期保留當時的餐次名稱。</p>
              <Field label="餐次名稱">
                <input name="name" defaultValue={renameSlot} maxLength={30} required autoFocus />
              </Field>
              <button className="button">儲存名稱</button>
            </form>
          ) : sheet === "slots" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const names = slotText
                  .split("\n")
                  .map((n) => n.trim())
                  .filter(Boolean);
                if (!names.length || new Set(names).size !== names.length) {
                  notify("請保留至少一個餐次，名稱不可重複");
                  return;
                }
                if (
                  save("更新往後每日餐次", (s) => {
                    s.mealSlots = names;
                  })
                ) {
                  setSlot(names[0]);
                  setSheet("meal");
                  notify();
                }
              }}
            >
              <p className="muted">
                每行一餐。可改名、刪除或調整順序；之後每日沿用，過去紀錄保留原餐次。
              </p>
              <textarea
                aria-label="每日餐次"
                value={slotText}
                onChange={(e) => setSlotText(e.target.value)}
                required
                maxLength={300}
              />
              <button className="button">保存餐次</button>
            </form>
          ) : sheet === "add" ? (
            <div className="cinematic-quick-add">
              <Field label="加入哪一餐">
                <select aria-label="加入哪一餐" value={slot} onChange={(e) => setSlot(e.target.value)}>
                  {state.mealSlots.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
              <div className="action-list">
              <button onClick={() => setSheet("food")}>
                <Utensils />
                Food
                <ChevronRight />
              </button>
              <button
                onClick={() => {
                  setFood(null);
                  setSheet("manual");
                }}
              >
                <Plus />
                Quick Macro
                <ChevronRight />
              </button>
              <Link
                href={`/nutrition/recipes?meal=${encodeURIComponent(slot)}&date=${selectedDate}`}
              >
                <BookOpen />
                食譜
                <ChevronRight />
              </Link>
              </div>
            </div>
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
                  setQuantity(f.base);
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
                  <div className="form-grid">
                    {(["p", "c", "f"] as const).map((key, i) => (
                      <Field
                        key={key}
                        label={`想攝取${["蛋白質", "碳水", "脂肪"][i]} g`}
                      >
                        <input
                          type="number"
                          min="0"
                          max="1000"
                          step="0.1"
                          disabled={!food[key]}
                          value={
                            food[key]
                              ? round((food[key] * quantity) / food.base)
                              : ""
                          }
                          placeholder="此食物不含此營養素"
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
