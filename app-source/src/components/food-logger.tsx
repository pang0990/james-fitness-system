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
  type PlateItem,
  type MealSnapshot,
} from "@/lib/food-plate";
import { validateNewMealInput } from "@/lib/nutrition-input";
import master from "@/content/foods.json";
import cooked from "@/content/cooked-foods.json";
import official from "@/content/fda-foods.json";

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
  const [tab, setTab] = useState(initialTab === "recipes" ? "food" : initialTab);
  const [view, setView] = useState<"search" | "portion" | "plate">("search");
  const [plate, setPlate] = useState<PlateItem[]>([]);
  const [message, setMessage] = useState("");
  const [contextOpen, setContextOpen] = useState(false);
  const [sourceDate, setSourceDate] = useState(addDays(date, -1));
  const [sourceSlot, setSourceSlot] = useState(slot);
  const [targetDate, setTargetDate] = useState(date);
  const [templateName, setTemplateName] = useState("");
  const [selected, setSelected] = useState<MealSnapshot | null>(null);
  const [editingPlateId, setEditingPlateId] = useState<string | null>(null);
  const [weightText, setWeightText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const lock = useRef(false);

  useEffect(() => {
    if (!plate.length) return;
    const stop = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", stop);
    return () => window.removeEventListener("beforeunload", stop);
  }, [plate.length]);
  function navigate(next: "search" | "portion" | "plate") {
    setView(next);
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }
  function appendSnapshots(rows: MealSnapshot[]) {
    if (!rows.length) return;
    onDirty(true);
    setPlate(old => [...old, ...rows.map(snapshot => ({
      id: uid(), snapshot: mealSnapshot(snapshot), quantity: snapshot.quantity
    }))]);
    setMessage("已加入待確認清單，尚未寫入正式紀錄");
    navigate("plate");
  }
  function openPortion(snapshot: MealSnapshot, plateId: string | null = null) {
    setSelected(mealSnapshot(snapshot));
    setEditingPlateId(plateId);
    setWeightText(String(plateId ? plate.find(item => item.id === plateId)?.quantity ?? snapshot.quantity : snapshot.quantity));
    setMessage("");
    navigate("portion");
  }
  const grams = Number(weightText);
  const validQuantity = weightText.trim() !== "" && Number.isFinite(grams) && grams > 0 && grams <= 10000;
  let portionPreview: MealSnapshot | null = null;
  if (selected && validQuantity) {
    try {
      portionPreview = portion({ id: "preview", snapshot: selected, quantity: grams });
      validateNewMealInput({ ...portionPreview, slot });
    } catch { portionPreview = null; }
  }
  function savePortion() {
    if (!selected || !portionPreview) return;
    onDirty(true);
    if (editingPlateId) {
      setPlate(items => items.map(item => item.id === editingPlateId ?
        { ...item, quantity: grams } : item));
    } else {
      setPlate(items => [...items, {
        id: uid(), snapshot: mealSnapshot(selected), quantity: grams,
      }]);
    }
    setMessage("份量已加入待確認清單");
    navigate("plate");
  }
  const library = [...master, ...cooked, ...official, ...state.foods] as Food[];
  const copyItems = /^\d{4}-\d{2}-\d{2}$/.test(sourceDate)
    ? visibleMeals(state, sourceDate).filter(m => m.slot === sourceSlot) : [];
  const availableSlots = Array.from(new Set([
    ...state.mealSlots, ...visibleMeals(state, sourceDate).map(m => m.slot),
  ]));
  let validPlate = plate.length > 0;
  const totals = { p:0, c:0, f:0, kcal:0 };
  for (const item of plate) {
    try {
      const current = portion(item);
      validateNewMealInput({ ...current, slot });
      for (const key of ["p","c","f","kcal"] as const) totals[key] += current[key];
    } catch { validPlate = false; }
  }
  const isFavorite = selected?.foodId ? (state.favoriteFoods ?? []).includes(selected.foodId) : false;
  const canFavorite = !!selected?.foodId && library.some(f => f.id === selected.foodId);
  return (
    <div className="food-logger food-logger--v2">
      <div className="logger-context">
        <button type="button" className="logger-context-button" onClick={() => setContextOpen(v => !v)}
          aria-expanded={contextOpen}>
          {targetDate} · {slot} <span aria-hidden="true">⌄</span>
        </button>
        {contextOpen && <div className="logger-context-edit">
          <Field label="記錄日期">
            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
          </Field>
          <Field label="加入哪一餐">
            <select aria-label="加入哪一餐" value={slot} onChange={e => onSlot(e.target.value)}>
              {Array.from(new Set([...state.mealSlots, slot])).map(name => <option key={name}>{name}</option>)}
            </select>
          </Field>
        </div>}
      </div>
      <div className="logger-scroll" ref={scrollRef}>
        {view === "portion" && selected ? (
          <section className="logger-portion" aria-label="編輯食物份量">
            <div className="logger-portion-head">
              <button type="button" className="logger-back" onClick={() => navigate(editingPlateId ? "plate" : "search")}>← 返回</button>
              {canFavorite && <button type="button" className="logger-favorite"
                aria-pressed={isFavorite}
                onClick={() => {
                  if (!selected.foodId) return;
                  const id = selected.foodId;
                  save("更新收藏食物", draft => {
                    draft.favoriteFoods = draft.favoriteFoods?.includes(id)
                      ? draft.favoriteFoods.filter(value => value !== id)
                      : [...(draft.favoriteFoods ?? []), id];
                  });
                }}>{isFavorite ? "♥ 已收藏" : "♡ 收藏"}</button>}
            </div>
            <h3>{selected.name}</h3>
            <p className="muted">請輸入實際食用重量</p>
            <label className="logger-weight-label" htmlFor="logger-food-weight">食用重量</label>
            <div className="logger-weight-input">
              <input id="logger-food-weight" aria-label="食用重量" inputMode="decimal"
                type="number" min="0.1" max="10000" step="any"
                value={weightText} onChange={e => setWeightText(e.target.value)} />
              <strong>{selected.unit}</strong>
            </div>
            {!validQuantity && <p role="alert" className="logger-validation">請輸入有效的食用重量。</p>}
            <section className="logger-nutrition-preview" aria-label="換算後營養">
              <p className="muted">依照輸入重量換算</p>
              <div className="logger-calorie-amount">{portionPreview ? Math.round(portionPreview.kcal).toLocaleString("en-US") : "—"} <small>kcal</small></div>
              <div className="logger-macro-grid">
                {([
                  ["蛋白質", portionPreview?.p],
                  ["碳水", portionPreview?.c],
                  ["脂肪", portionPreview?.f],
                ] as const).map(([label, amount]) => <div key={label}>
                  <strong>{amount === undefined ? "—" : amount.toFixed(1)} <small>g</small></strong>
                  <span>{label}</span>
                </div>)}
              </div>
            </section>
          </section>
        ) : view === "plate" ? (
          <section className="logger-plate" aria-label="待確認清單">
            <div className="logger-plate-heading">
              <h3>待確認清單 · {plate.length} 項</h3>
              <button type="button" className="text-link" onClick={() => {setTab("food");navigate("search");}}>＋ 繼續新增</button>
            </div>
            {plate.length === 0 && <p className="muted">尚未選擇食物。回到搜尋並加入食品。</p>}
            {plate.map(item => {
              let preview: MealSnapshot | null = null;
              try { preview = portion(item); } catch {}
              return <div className="logger-plate-item" key={item.id}>
                <button type="button" className="logger-plate-item-main"
                  onClick={() => openPortion(item.snapshot, item.id)}>
                  <strong>{item.snapshot.name}</strong>
                  <span>{item.quantity} {item.snapshot.unit} · {preview?.kcal ?? "—"} kcal</span>
                </button>
                <button type="button" className="logger-plate-remove" aria-label={"移除 " + item.snapshot.name}
                  onClick={() => {
                    const remaining = plate.filter(x => x.id !== item.id);
                    setPlate(remaining); onDirty(remaining.length > 0);
                  }}>移除</button>
              </div>;
            })}
            {!!plate.length && <details className="logger-save-template">
              <summary>另存為常吃套餐（選填）</summary>
              <Field label="套餐名稱">
                <input maxLength={80} value={templateName} onChange={e => setTemplateName(e.target.value)}/>
              </Field>
              <button type="button" className="button secondary"
                disabled={!validPlate || !templateName.trim()}
                onClick={() => {
                  if (save("儲存常吃套餐", draft => {
                    (draft.savedMeals ??= []).push({
                      id:uid(), name:templateName.trim(), createdAt:stamp(), items:plate.map(portion),
                    });
                  })) {
                    setTemplateName("");
                    setMessage("套餐已儲存，尚未加入當日飲食紀錄");
                  }
                }}>儲存清單為套餐</button>
            </details>}
          </section>
        ) : (
          <>
            <nav className="logger-tabs" aria-label="記錄方式">
              {([
                ["food","搜尋食物"],["quick","Quick Macro"],["copy","複製餐點"],["saved","常吃套餐"],
              ] as const).map(([id,label]) =>
                <button type="button" className="button secondary" aria-pressed={tab===id}
                  key={id} onClick={() => setTab(id)}>{label}</button>)}
            </nav>
            <div hidden={tab !== "food"} className="logger-search-section">
              <FoodPicker addToPlate
                onSelect={food => openPortion(foodSnapshot(food as Food))}
                onRecipeSelect={snapshot => openPortion(snapshot)}
              />
            </div>
            {tab === "quick" && <form className="stack" onSubmit={e => {
              e.preventDefault();
              const form=e.currentTarget, data=new FormData(form);
              const p=Number(data.get("p")),c=Number(data.get("c")),f=Number(data.get("f"));
              try {
                const m=validateNewMealInput({
                  name:String(data.get("name")),slot,quantity:1,p,c,f,kcal:p*4+c*4+f*9,
                });
                appendSnapshots([{...m,unit:"份"}]);form.reset();
              } catch(err) {setMessage(err instanceof Error?err.message:"輸入無效");}
            }}>
              <Field label="這餐吃了什麼"><input name="name" required maxLength={80}/></Field>
              <div className="form-grid">
                {(["p","c","f"] as const).map(key => <Field key={key}
                  label={{p:"蛋白質 g",c:"碳水 g",f:"脂肪 g"}[key]}>
                  <input name={key} type="number" min="0" max="1000" step="0.1" required/>
                </Field>)}
              </div>
              <button className="button secondary">加入待確認清單</button>
            </form>}
            {tab === "copy" && <div className="stack">
              <Field label="來源日期"><input type="date" value={sourceDate}
                onChange={e=>setSourceDate(e.target.value)}/></Field>
              <Field label="來源餐次"><select value={sourceSlot} onChange={e=>setSourceSlot(e.target.value)}>
                {availableSlots.map(name=><option key={name}>{name}</option>)}
              </select></Field>
              <p className="muted">複製歷史份量與營養快照，不會重新套用目前食品資料。</p>
              {copyItems.map(meal=><div className="simple-row" key={meal.id}>
                <span>{meal.name} · {meal.quantity} {meal.unit}</span>
                <button className="text-link" type="button"
                  onClick={()=>appendSnapshots([mealSnapshot(meal)])}>選取</button>
              </div>)}
              {copyItems.length ? <button className="button secondary" type="button"
                onClick={()=>appendSnapshots(copyItems)}>選取整餐至清單</button>
                : <p>這一天這一餐沒有有效紀錄。</p>}
            </div>}
            {tab === "saved" && <div className="stack">
              {state.savedMeals?.map(saved=><div className="simple-row" key={saved.id}>
                <span>{saved.name} · {saved.items.length} 項</span>
                <button type="button" className="text-link" onClick={()=>appendSnapshots(saved.items)}>加入套餐</button>
                <button type="button" className="text-link" onClick={()=>{
                  if(window.confirm("刪除套餐？已記錄餐點不受影響。"))
                    save("刪除常吃套餐", draft => {
                      draft.savedMeals=draft.savedMeals?.filter(x=>x.id!==saved.id);
                    });
                }}>刪除</button>
              </div>)}
              {!state.savedMeals?.length && <p>尚無套餐；請先記錄食物再儲存。</p>}
            </div>}
          </>
        )}
        {message && <p className="logger-message" role="status">{message}</p>}
        {error && <p className="logger-validation" role="alert">{error}</p>}
      </div>
      {view === "portion" ? <div className="logger-footer">
        <button type="button" className="button" disabled={!portionPreview} onClick={savePortion}>
          {editingPlateId ? "更新份量" : "加入待確認清單"}
        </button>
      </div> : view === "plate" ? <div className="logger-footer food-plate-confirm">
        <div className="logger-footer-total">
          <strong>{Math.round(totals.kcal)} kcal</strong>
          <span>P {Math.round(totals.p)} · C {Math.round(totals.c)} · F {Math.round(totals.f)}</span>
        </div>
        <button type="button" className="button"
          disabled={!validPlate || !targetDate}
          onClick={() => {
            if(lock.current) return;
            lock.current=true;
            try {
              if(save("批次新增飲食",draft=>commitPlate(draft,plate,targetDate,slot,stamp()))) {
                onDirty(false);setPlate([]);onDone();
              } else setMessage("儲存失敗，待確認清單仍保留，請重試");
            } finally {lock.current=false;}
          }}>確認加入 {plate.length} 項食物</button>
      </div> : plate.length > 0 ? <div className="logger-footer logger-footer-mini">
        <span>待加入 {plate.length} 項 · {Math.round(totals.kcal)} kcal</span>
        <button className="button" type="button" onClick={()=>navigate("plate")}>查看清單</button>
      </div> : null}
    </div>
  );
}
