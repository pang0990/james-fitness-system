"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  Activity, ArrowRight, Check, ChevronRight, Droplet, Dumbbell, HeartPulse,
  Moon, Plus, Scale, Sparkles, Utensils, Zap,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { resolveTrainingToday } from "@/lib/training-overview";
import { latestRecovery } from "@/lib/recovery";
import {
  mealTotals, resolveDay, round, waterTotal, type RecoveryEntry,
} from "@/lib/domain";
import { NoticeCarousel } from "./notices";
import { RecoveryQuickLog } from "./recovery-log";
import { DailyActivity } from "./daily-activity";
import { FitnessEquipmentVisual } from "./ui/fitness-equipment-visual";
import { UiActionLink } from "./ui/design-system";
import { GlassCard, GlassButton, GlassInput, GlassProgress, GlassSheet } from "./ui/glass-system";
import { Sheet, stamp, uid } from "./daily";

import { FoodLogger } from "./food-logger";

type QuickKind = RecoveryEntry["type"] | "weight";
type Props = { date: string; notify: (message?: string) => void };
const fmt = (value: number) => Math.round(value).toLocaleString("en-US");
const pct = (value: number, target?: number | null) =>
  target && target > 0 ? Math.min(100, Math.max(0, value / target * 100)) : 0;

/** Today 3.0 — scoped to Minimal. All persistent changes use the existing store. */
export function TodayMinimalV3({ date, notify }: Props) {
  const { state, save } = useStore();
  const [quick, setQuick] = useState<{ date: string; kind: QuickKind } | null>(null);
  const [foodOpen, setFoodOpen] = useState(false);
  const [foodDirty, setFoodDirty] = useState(false);
  const [foodSlot, setFoodSlot] = useState(() => state.meals.filter(m => !m.deleted).at(-1)?.slot ?? state.mealSlots[0] ?? "早餐");
  const [waterEdit, setWaterEdit] = useState(false);
  const training = resolveTrainingToday(state,date);
  const {current, completed:completedToday, cycle, day} = training;
  const completedMinutes = Math.round(completedToday.reduce((sum, session) =>
    sum + (session.activeDuration ?? Math.max(
      0,
      Date.parse(session.completedAt ?? session.createdAt) - Date.parse(session.createdAt),
    )) / 60000, 0,
  ));
  // Round is distinct from the number of completed Cycle Days.
  const cycleRound = cycle?.round ?? 1;

  const isDone = !current && completedToday.length > 0;
  const focusName = training.title;
  const focusMeta = isDone ? `${completedToday.length} 場訓練 · ${completedMinutes} 分鐘`
    : training.kind === "rest" ? "依行事曆安排休息" : training.kind === "pending" ? `待練：${day?.name ?? ""} · 尚未指定日期`
    : `${current?.exercises.length ?? day?.exercises?.length ?? 0} 個動作${current ? " · 進行中" : ""}`;
  const trainingHref = training.href;
  const actionLabel = training.label;

  const target = resolveDay(state, date).target;
  const nutrition = mealTotals(state, date);
  const caloriePercentage = pct(nutrition.kcal, target?.kcal);
  const hydration = waterTotal(state, date);
  const hydrationTarget = state.profile?.waterTarget ?? 0;
  const waterPercentage = pct(hydration, hydrationTarget);
  const recovery = latestRecovery(state, date);
  const recoveryKinds = recovery.filter((entry) => entry.type !== "pain").map((entry) => entry.type);
  const quicks: Array<{ label: string; kind: QuickKind; icon: typeof Scale }> = [
    { label: "體重", kind: "weight", icon: Scale },
    { label: "睡眠", kind: "sleep", icon: Moon },
    { label: "壓力", kind: "stress", icon: HeartPulse },
    { label: "疲勞", kind: "fatigue", icon: Zap },
    { label: "痠痛", kind: "soreness", icon: Activity },
  ];
  const dateObj = new Date(date + "T12:00:00");
  const dateDisplay = dateObj.toLocaleDateString("zh-TW", {
    month: "long", day: "numeric", weekday: "long",
  });

  function addWater(ml: number) {
    if (!Number.isFinite(ml) || ml <= 0) return;
    // The updated total and progress bar provide feedback; no save pop-up.
    save("新增飲水", (s) => {
      s.waters.push({ id: uid(), date, ml, createdAt: stamp() });
    });
  }

  return (
    <div className="today-reference-page today-v3" data-testid="today-v3">
      <div className="today-v3-heading">
        <div>
          <time dateTime={date}>{dateDisplay}</time>
          <h1>今天</h1>
          <p>你的訓練與日常紀錄</p>
        </div>
        {cycle && (
          <div className="today-v3-cycle" aria-label={"Cycle 第 " + cycleRound + " 輪"}>
            Cycle {String(cycleRound).padStart(2, "0")}
          </div>
        )}
      </div>

      <div className="today-v3-notice" id="today-action-queue">
        <span className="today-v3-notice-marker" aria-hidden="true"><Sparkles size={17}/></span>
        <div className="today-v3-notice-content">
          <NoticeCarousel date={date} onLog={(d) => setQuick({ kind: "sleep", date: d })}/>
        </div>
      </div>

      <div className="today-v3-grid">
        <GlassCard className="today-v3-focus jfs3-surface" raised aria-labelledby="today-v3-focus-title">
          <div className="jfs3-section-heading">
            <span className="jfs3-heading-label"><Dumbbell size={17} aria-hidden="true" /> 今日重點</span>
            <span className="today-v3-focus-state">{current ? "進行中" : isDone ? "已完成" : day ? "已排定" : "尚未設定"}</span>
          </div>
          <div className="today-v3-focus-content">
            <div>
              <h2 id="today-v3-focus-title">{focusName}</h2>
              <p>{focusMeta}</p>
            </div>
            <div className={"today-v3-focus-glyph" + (isDone ? "" : " equipment")} aria-hidden="true">
              {isDone ? <Check size={38} strokeWidth={1.35}/> : <FitnessEquipmentVisual/>}
            </div>
          </div>
          <UiActionLink className="jfs3-primary today-v3-focus-action" href={trainingHref}>
            {actionLabel}<ArrowRight size={19} aria-hidden="true"/>
          </UiActionLink>
        </GlassCard>

        <GlassCard className="today-v3-nutrition jfs3-surface" aria-labelledby="today-v3-nutrition-title">
          <div className="jfs3-section-heading">
            <h2 id="today-v3-nutrition-title"><Utensils size={17} aria-hidden="true" /> 今日飲食</h2>
            <Link href="/nutrition" className="jfs3-icon-link" aria-label="查看完整營養資訊"><ChevronRight size={18}/></Link>
          </div>
          <div className="today-v3-nutrition-body">
            <div className="jfs3-ring" style={{ "--jfs3-fill": String(caloriePercentage) + "%" } as CSSProperties}
              aria-label={"已攝取 " + fmt(nutrition.kcal) + (target ? "，目標 " + fmt(target.kcal) : "，目標尚未設定") + " 千卡"}>
              <div className="jfs3-ring-center">
                <strong>{fmt(nutrition.kcal)}</strong>
                <small>{target ? "/ " + fmt(target.kcal) + " kcal" : "尚未設定目標"}</small>
              </div>
            </div>
            <div className="today-v3-macros">
              {([
                { label: "P", name: "蛋白質", value: nutrition.p, goal: target?.p },
                { label: "C", name: "碳水", value: nutrition.c, goal: target?.c },
                { label: "F", name: "脂肪", value: nutrition.f, goal: target?.f },
              ] as const).map(({ label, name, value, goal }) => (
                <div className="today-v3-macro" key={label} aria-label={name + " " + round(value) + " / " + (goal ?? "—") + " g"}>
                  <span>{label}</span>
                  <div className="jfs3-track"><i style={{ width: String(pct(value, goal)) + "%" }}/></div>
                  <small>{round(value)} / {goal ?? "—"} g</small>
                </div>
              ))}
            </div>
          </div>
          <GlassButton kind="secondary" className="jfs3-secondary today-v3-food-add" onClick={() => setFoodOpen(true)}>
            <Plus size={17} aria-hidden="true"/> 加入飲食
          </GlassButton>
        </GlassCard>

        <GlassCard className="today-v3-training jfs3-surface" aria-labelledby="today-v3-training-title">
          <div className="jfs3-section-heading">
            <h2 id="today-v3-training-title"><Dumbbell size={17} aria-hidden="true" /> 今日訓練</h2>
            <Link href="/training" className="jfs3-icon-link" aria-label="查看訓練課表"><ChevronRight size={18}/></Link>
          </div>
          <strong>{focusName}</strong>
          <p>{focusMeta}</p>
        </GlassCard>

        <div className="today-v3-wellness">
          <GlassCard className="today-v3-water jfs3-surface" aria-labelledby="today-v3-water-title">
            <div className="jfs3-section-heading">
              <h2 id="today-v3-water-title"><Droplet size={17} aria-hidden="true"/> 飲水</h2>
              <button type="button" className="jfs3-icon-link" onClick={() => setWaterEdit(true)}
                aria-label="修正今日飲水量"><ChevronRight size={18}/></button>
            </div>
            <div className="today-v3-water-total">
              <strong>{fmt(hydration)}</strong><small> / {hydrationTarget ? fmt(hydrationTarget) : "—"} ml</small>
            </div>
            <GlassProgress className="today-v3-water-track"
              value={hydration} target={hydrationTarget} label="今日飲水進度" />
            <div className="today-v3-water-actions">
              <GlassButton kind="secondary" onClick={() => addWater(Number(state.preferences?.waterQuick1 ?? 250))}>
                +{state.preferences?.waterQuick1 ?? 250} ml
              </GlassButton>
              <GlassButton kind="secondary" onClick={() => addWater(Number(state.preferences?.waterQuick2 ?? 500))}>
                +{state.preferences?.waterQuick2 ?? 500} ml
              </GlassButton>
            </div>
          </GlassCard>

          <GlassCard className="today-v3-recovery jfs3-surface" aria-labelledby="today-v3-recovery-title">
            <div className="jfs3-section-heading">
              <h2 id="today-v3-recovery-title"><HeartPulse size={17} aria-hidden="true"/> 恢復狀態</h2>
              <Link href="/progress" className="jfs3-icon-link" aria-label="查看恢復詳情"><ChevronRight size={18}/></Link>
            </div>
            <strong>{recovery.length ? "已建立紀錄" : "尚無紀錄"}</strong>
            <p>{recovery.length ? "今天 " + recovery.length + " 筆恢復紀錄" : "記錄今天的身體狀態"}</p>
            <GlassButton kind="secondary" className="jfs3-secondary today-v3-recovery-add"
              onClick={() => setQuick({ date, kind: "sleep" })}>
              {recovery.length ? "新增紀錄" : "開始記錄"} <ArrowRight size={15} aria-hidden="true"/>
            </GlassButton>
          </GlassCard>
        </div>

        <GlassCard className="today-v3-quick jfs3-surface" aria-labelledby="today-v3-quick-title">
          <div className="jfs3-section-heading">
            <h2 id="today-v3-quick-title"><Plus size={18} aria-hidden="true"/> 快速紀錄</h2>
            <Link href="/progress" className="jfs3-see-all">更多 <ChevronRight size={16}/></Link>
          </div>
          <div className="today-v3-quick-grid">
            {quicks.map(({ label, kind, icon: Icon }) => (
              <GlassButton kind="secondary" key={kind} className="today-v3-quick-item"
                aria-label={"記錄" + label} onClick={() => setQuick({ date, kind })}>
                <Icon size={19} strokeWidth={1.7} aria-hidden="true" />
                <span>{label}</span>
                {(kind !== "weight" && recoveryKinds.includes(kind))
                  ? <Check size={16} strokeWidth={2} aria-hidden="true"/>
                  : <Plus size={15} strokeWidth={1.8} aria-hidden="true"/>}
              </GlassButton>
            ))}
          </div>
        </GlassCard>

        <div className="today-v3-activity">
          <DailyActivity date={date} notify={notify}/>
        </div>
      </div>

      {quick && (
        <RecoveryQuickLog
          date={quick.date} initialKind={quick.kind}
          close={() => setQuick(null)} notify={notify}
        />
      )}
      {foodOpen && (
        <Sheet title="加入飲食" onClose={() => {
          if (foodDirty && !window.confirm("離開並放棄待確認食物？已儲存的紀錄不受影響。")) return;
          setFoodDirty(false); setFoodOpen(false);
        }}>
          <FoodLogger date={date} slot={foodSlot} onSlot={setFoodSlot} onDirty={setFoodDirty}
            onDone={() => {setFoodDirty(false);setFoodOpen(false);notify("已加入飲食紀錄");}} />
        </Sheet>
      )}
      {waterEdit && (
        <GlassSheet title="修正今日飲水" onClose={() => setWaterEdit(false)}>
          <form onSubmit={(e) => {
            e.preventDefault();
            const value = Number(new FormData(e.currentTarget).get("ml"));
            if (!Number.isFinite(value) || value < 0 || value > 10000) return;
            if (save("修正飲水總量", (s) => s.waters.push({
              id: uid(), date, ml: value - waterTotal(s, date), createdAt: stamp(),
            }))) {
              setWaterEdit(false);
            }
          }}>
            <GlassInput label="今日總飲水量 ml" type="number" required name="ml" defaultValue={hydration} min={0} step={50} max={10000}/>
            <GlassButton type="submit">儲存飲水量</GlassButton>
          </form>
        </GlassSheet>
      )}
    </div>
  );
}
