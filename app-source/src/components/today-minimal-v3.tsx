"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  Activity, ArrowRight, Check, ChevronRight, Droplet, Dumbbell, HeartPulse,
  Moon, Plus, Scale, Sparkles, Utensils, Zap,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { activeCycle } from "@/lib/training-model";
import { todayFocus } from "@/lib/today-focus";
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
import { NutritionV2, stamp, uid } from "./daily";

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
  const [waterEdit, setWaterEdit] = useState(false);
  const focus = todayFocus(state, date);
  const cycle = activeCycle(state);
  const cycleRound = cycle?.round ?? 1;

  const target = resolveDay(state, date).target;
  const nutrition = mealTotals(state, date);
  const caloriePercentage = pct(nutrition.kcal, target?.kcal);
  const hydration = waterTotal(state, date);
  const hydrationTarget = state.profile?.waterTarget ?? 0;
  const waterPercentage = pct(hydration, hydrationTarget);
  const recovery = latestRecovery(state, date);
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

      <div className="today-v3-grid">
        <GlassCard className="today-v3-focus jfs3-surface" raised aria-labelledby="today-v3-focus-title">
          <div className="jfs3-section-heading">
            <span className="jfs3-heading-label"><Dumbbell size={17} aria-hidden="true" /> 今日重點</span>
            <span className="today-v3-focus-state">{focus.status}</span>
          </div>
          <div className="today-v3-focus-content">
            <div>
              <h2 id="today-v3-focus-title">{focus.title}</h2>

            </div>
            <div className={"today-v3-focus-glyph" + (focus.status === "已完成" ? "" : " equipment")} aria-hidden="true">
              {focus.status === "已完成" ? <Check size={38} strokeWidth={1.35}/> : <FitnessEquipmentVisual/>}
            </div>
          </div>
          <UiActionLink className="jfs3-primary today-v3-focus-action" href={focus.href}>
            {focus.action}<ArrowRight size={19} aria-hidden="true"/>
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

              </div>

      {quick && (
        <RecoveryQuickLog
          date={quick.date} initialKind={quick.kind}
          close={() => setQuick(null)} notify={notify}
        />
      )}
      {foodOpen && (
        <NutritionV2 path="nutrition/log" date={date} notify={notify}
          inlineClose={() => setFoodOpen(false)}
        />
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
