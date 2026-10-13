"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity, AlertCircle, ArrowRight, ChevronRight, Cookie, Droplet,
  Dumbbell, Flame, HeartPulse, Moon, Plus, Scale, Sparkles,
  Utensils, Waves, Zap,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { activeCycle } from "@/lib/training-model";
import { nextDayIndex } from "@/lib/training-queue";
import { latestRecovery } from "@/lib/recovery";
import {
  mealTotals, resolveDay, round, waterTotal,
  type RecoveryEntry,
} from "@/lib/domain";
import { CityAtmosphere } from "./city-atmosphere";
import { NoticeCarousel } from "./notices";
import { RecoveryQuickLog } from "./recovery-log";
import { DailyActivity } from "./daily-activity";
import { NutritionV2, Num, Sheet, stamp, uid } from "./daily";

type QuickKind = RecoveryEntry["type"] | "weight";
type TodayReferenceProps = { date: string; notify: (message?: string) => void };
const fmt = (value: number) => Math.round(value).toLocaleString("en-US");
const percent = (actual: number, target?: number | null) =>
  target && target > 0 ? Math.min(100, Math.max(0, (actual / target) * 100)) : 0;

export function TodayReference({ date, notify }: TodayReferenceProps) {
  const { state, save } = useStore();
  const [interaction, setInteraction] = useState(false);
  const [quick, setQuick] = useState<{ date: string; kind: QuickKind } | null>(null);
  const [foodOpen, setFoodOpen] = useState(false);
  const [waterEdit, setWaterEdit] = useState(false);
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => {
    setHour(new Date().getHours());
  }, []);

  const current = state.sessions.find((session) => session.status === "in_progress");
  const cycle = activeCycle(state);
  const completed = cycle
    ? (state.cycleEvents?.filter((event) =>
      event.cycleId === cycle.id && ["completed", "skipped"].includes(event.type)).length ?? 0)
    : 0;
  const day = cycle?.days[Math.max(0, nextDayIndex(state, cycle))];
  const trainingName = current?.name || day?.name || "尚未建立訓練計畫";
  const trainingUrl = current ? "/training/session" : "/training";
  const trainingButton = current ? "繼續訓練" : day ? "開始訓練" : "建立課表";
  const trainingExercises = current?.exercises?.length ?? day?.exercises?.length ?? 0;
  const target = resolveDay(state, date).target;
  const nutrition = mealTotals(state, date);
  const remaining = target ? Math.round(target.kcal - nutrition.kcal) : null;
  const hydration = waterTotal(state, date);
  const hydrationTarget = state.profile?.waterTarget ?? 0;
  const waterPct = percent(hydration, hydrationTarget);
  const dateObject = new Date(`${date}T12:00:00`);
  const monthDay = dateObject.toLocaleDateString("en-US", {month: "short", day: "numeric"}).toUpperCase();
  const weekday = dateObject.toLocaleDateString("en-US", {weekday: "long"}).toUpperCase();
  const greeting = hour === null || hour < 12 ? "GOOD MORNING" : hour < 18 ? "GOOD AFTERNOON" : "GOOD EVENING";
  const displayName = state.profile?.name?.trim() || "WANDERER";
  const recovery = latestRecovery(state, date);
  const quicks: Array<{ label: string; kind: QuickKind; icon: typeof Scale }> = [
    {label: "體重", kind: "weight", icon: Scale},
    {label: "睡眠", kind: "sleep", icon: Moon},
    {label: "壓力", kind: "stress", icon: HeartPulse},
    {label: "疲勞", kind: "fatigue", icon: Zap},
    {label: "痠痛", kind: "soreness", icon: Activity},
  ];
  const logTypes = recovery.filter((entry) => entry.type !== "pain").map((entry) => entry.type);
  function log(kind: QuickKind, dayToLog = date) { setQuick({ kind, date: dayToLog }); }
  function addWater(ml: number) {
    if (save("新增飲水", (s) => {
      s.waters.push({id: uid(), date, ml, createdAt: stamp()});
    })) notify("飲水已儲存");
  }
  return (
    <div className="today-reference-page">
      <section className="today-ref-scene" aria-label="雨夜未來都市與行者">
        <CityAtmosphere />
        <div className="today-ref-heading">
          <div className="today-ref-intro">
            <span className="today-ref-eyebrow">{greeting}</span>
            <h1>{displayName}</h1>
            <span className="today-ref-rule" />
            <p>持續前進，<br />即使孤獨，<br />也會更強的自己。</p>
            <span className="today-ref-motto">PROGRESS<br />IS<br />MOVEMENT.</span>
          </div>
          <div className="today-ref-cycle">
            <time dateTime={date}><strong>{monthDay}</strong><small>{weekday}</small></time>
            <div className="today-ref-cycle-count">
              <span>CYCLE DAY</span>
              <strong>{cycle ? completed + 1 : "—"}</strong>
            </div>
          </div>
        </div>
        <div className="today-ref-interaction">
          <button
            type="button"
            className={interaction ? "today-ref-interact active" : "today-ref-interact"}
            onClick={() => setInteraction((value) => !value)}
            aria-pressed={interaction}
            aria-label="切換城市觀察狀態"
          >
            <span>◇</span> {interaction ? "KEEP MOVING" : "TAP TO INTERACT"} <ChevronRight size={17} />
          </button>
          <span>{interaction ? "OBSERVING · 觀察城市" : "WALKING · 行走"}</span>
        </div>
      </section>

      <section className="today-ref-action-panel" id="today-action-queue" aria-labelledby="today-ref-action-label">
        <div className="today-ref-section-heading">
          <h2 id="today-ref-action-label"><Sparkles size={15} /> TODAY ACTION QUEUE</h2>
          <span className="today-ref-action-count">YOUR DAILY ACTIONS</span>
        </div>
        <div className="today-ref-action-list">
          <div className="today-ref-action-row today-ref-alert">
            <AlertCircle size={24} aria-hidden="true" />
            <div className="today-ref-notice"><NoticeCarousel date={date} onLog={(d) => log("sleep", d)} /></div>
          </div>
          <Link className="today-ref-action-row today-ref-workout-row" href={trainingUrl}>
            <Dumbbell size={23} aria-hidden="true" />
            <div className="today-ref-action-copy">
              <strong>{current ? "繼續今天的訓練" : day ? "今天 · 準備開始訓練" : "今天 · 建立訓練計畫"}</strong>
              <span>{trainingName}{trainingExercises ? ` · ${trainingExercises} 個動作` : ""}</span>
            </div>
            <span className="today-ref-action-pill">{trainingButton} <ArrowRight size={15}/></span>
          </Link>
          <Link className="today-ref-action-row today-ref-nutrition-row" href="/nutrition">
            <Utensils size={23} aria-hidden="true"/>
            <div className="today-ref-action-copy">
              <strong>{remaining === null ? "今天 · 設定飲食目標" : `今天 · ${remaining >= 0 ? "剩餘" : "超出"} ${fmt(Math.abs(remaining))} kcal`}</strong>
              <span>{`蛋白質 ${round(nutrition.p)} / ${target?.p ?? "—"} g · 碳水 ${round(nutrition.c)} / ${target?.c ?? "—"} g`}</span>
            </div>
            <ChevronRight size={17}/>
          </Link>
        </div>
      </section>

      <section className="today-ref-metrics" aria-label="今日摘要">
        <article className="today-ref-card today-ref-training">
          <Link className="today-ref-card-label" href="/training"><Dumbbell size={16}/> 今日訓練 <ChevronRight size={14}/></Link>
          <strong className="today-ref-training-name">{trainingName}</strong>
          <p>{trainingExercises ? `${trainingExercises} 個動作` : "Training Plan"}</p>
          <Link className="today-ref-small-action" href={trainingUrl}>{trainingButton} <ArrowRight size={13}/></Link>
        </article>

        <article className="today-ref-card today-ref-food">
          <Link className="today-ref-card-label" href="/nutrition"><Utensils size={16}/> 今日飲食 <ChevronRight size={14}/></Link>
          <div className="today-ref-food-body">
            <div className="today-ref-energy-ring" style={{background: `conic-gradient(#54c9e3 0 ${percent(nutrition.kcal,target?.kcal)*.78}%,#ddb16b ${percent(nutrition.kcal,target?.kcal)*.78}% ${percent(nutrition.kcal,target?.kcal)}%,#252a2c ${percent(nutrition.kcal,target?.kcal)}% 100%)`}}>
              <div><strong>{fmt(nutrition.kcal)}</strong><small>/ {target ? fmt(target.kcal) : "—"} kcal</small></div>
            </div>
            <div className="today-ref-macros">
              {([
                {label:"P", value:nutrition.p, goal:target?.p, className:"protein"},
                {label:"C", value:nutrition.c, goal:target?.c, className:"carbs"},
                {label:"F", value:nutrition.f, goal:target?.f, className:"fat"},
              ] as const).map((m) => <div key={m.label} className={m.className}>
                <span>{m.label}</span><i style={{width:`${percent(m.value,m.goal)}%`}}/><small>{round(m.value)} / {m.goal ?? "—"} g</small>
              </div>)}
            </div>
          </div>
          <button className="today-ref-inline-add" type="button" onClick={() => setFoodOpen(true)}>
            <Plus size={14}/> 加入飲食
          </button>
        </article>

        <article className="today-ref-card today-ref-water">
          <div className="today-ref-card-label"><Droplet size={16}/> 飲水
            <button type="button" onClick={() => setWaterEdit(true)} aria-label="編輯今日飲水量"><ChevronRight size={14}/></button>
          </div>
          <strong className="today-ref-water-number">{hydration ? fmt(hydration) : "—"}<small> / {hydrationTarget ? fmt(hydrationTarget) : "—"} ml</small></strong>
          <div className="today-ref-water-meter"><span style={{width:`${waterPct}%`}}/></div>
          <div className="today-ref-water-actions">
            <button type="button" onClick={() => addWater(Number(state.preferences?.waterQuick1 ?? 250))}>+{state.preferences?.waterQuick1 ?? 250} ml</button>
            <button type="button" onClick={() => addWater(Number(state.preferences?.waterQuick2 ?? 500))}>+{state.preferences?.waterQuick2 ?? 500} ml</button>
          </div>
        </article>
      </section>

      <section className="today-ref-quick-panel" aria-labelledby="today-ref-quick-title">
        <div className="today-ref-section-heading">
          <h2 id="today-ref-quick-title"><Waves size={16}/> 快速紀錄</h2>
          <Link href="/progress">更多 <ChevronRight size={13}/></Link>
        </div>
        <div className="today-ref-quick-grid">
          {quicks.map(({label,kind,icon:Icon}) => (
            <button type="button" key={kind} onClick={() => log(kind)}>
              <Icon size={17}/><span>{label}</span>{(kind !== "weight" && logTypes.includes(kind)) ? <span className="today-ref-logged">✓</span> : <Plus size={17}/>}
            </button>
          ))}
        </div>
      </section>

      <DailyActivity date={date} notify={notify}/>
      {quick && <RecoveryQuickLog
        date={quick.date} initialKind={quick.kind}
        close={() => setQuick(null)} notify={notify}
      />}
      {foodOpen && <NutritionV2 path="nutrition/log" date={date} notify={notify}
        inlineClose={() => setFoodOpen(false)} />}
      {waterEdit && <Sheet title="修正今日飲水" onClose={() => setWaterEdit(false)}>
        <form onSubmit={(e) => {
          e.preventDefault();
          const value = Number(new FormData(e.currentTarget).get("ml"));
          if (!Number.isFinite(value) || value < 0 || value > 10000) return;
          if (save("修正飲水總量", (s) => s.waters.push({
            id:uid(), date, ml:value-waterTotal(s,date), createdAt:stamp(),
          }))) {notify("已更新飲水");setWaterEdit(false);}
        }}>
          <Num label="今日總飲水量 ml" name="ml" value={hydration} step="50" max={10000}/>
          <button type="submit" className="button">儲存</button>
        </form>
      </Sheet>}
    </div>
  );
}
