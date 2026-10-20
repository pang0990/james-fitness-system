"use client";

import Link from "next/link";
import { ArrowRight, Plus, Utensils } from "lucide-react";
import { useStore } from "@/lib/store";
import { dayNames, mealTotals, resolveDay, visibleMeals } from "@/lib/domain";
import { UiEmptyState } from "./ui/design-system";
import { GlassCard, GlassButton, GlassProgress } from "./ui/glass-system";
import type { CSSProperties } from "react";

const num = (n: number) => Math.round(n).toLocaleString("en-US");

export function NutritionDashboardV3({
  date, onAddMeal,
}: { date: string; onAddMeal: () => void }) {
  const { state } = useStore();
  const day = resolveDay(state, date);
  const meals = visibleMeals(state, date);
  const total = mealTotals(state, date);
  const target = day.target;
  const targetCal = target?.kcal ?? null;
  const remaining = targetCal !== null ? Math.round(targetCal - total.kcal) : null;
  const percent = targetCal && targetCal > 0
    ? Math.min(100, Math.max(0, total.kcal / targetCal * 100)) : 0;
  const over = remaining !== null && remaining < 0;
  const hasLog = meals.length > 0 || day.complete;
  const summary = [
    {key: "p" as const, label:"蛋白質", abbr:"P"},
    {key: "c" as const, label:"碳水", abbr:"C"},
    {key: "f" as const, label:"脂肪", abbr:"F"},
  ];

  return <GlassCard className="nutrition-v3b" id="nutrition-calories" aria-label="今日營養摘要" data-testid="nutrition-v3b">
    <div className="nutrition-v3b-topline">
      <div>
        <span className="nutrition-v3b-eyebrow">NUTRITION OVERVIEW</span>
        <h2>今日飲食</h2>
      </div>
      <span className="nutrition-v3b-daytype">{dayNames[day.dayType] ?? day.dayType}</span>
    </div>
    <div className="nutrition-v3b-upper">
      <div className="nutrition-v3b-energy">
        <div className="nutrition-v3b-energy-ring" role="img"
          style={{"--nutrition-v3b-percent": percent+"%"} as CSSProperties}
          aria-label={`已攝取 ${hasLog ? num(total.kcal) : "0"} 千卡，${targetCal !== null ? "目標 "+num(targetCal) : "目標未設定"} 千卡`}>
          <div className="nutrition-v3b-ring-inner">
            <strong>{num(total.kcal)}</strong>
            <small>/ {targetCal !== null ? num(targetCal) : "—"} kcal</small>
          </div>
        </div>
        <div className="nutrition-v3b-energy-stats">
          <span>{over ? "超出目標" : "剩餘熱量"}</span>
          <div><strong>{remaining === null ? "—" : num(Math.abs(remaining))}</strong><small> kcal</small></div>
          <p>{targetCal === null ? "尚未設定營養目標" : hasLog ? "依照目前紀錄計算" : "今天還沒有飲食紀錄"}</p>
        </div>
      </div>
      <div className="nutrition-v3b-macros" aria-label="三大營養素紀錄">
        {summary.map(({key,label,abbr}) => {
          const goal = target?.[key] ?? null;
          const amount = total[key];
          const exceeded = goal !== null && amount > goal;
          return <div key={key} className="nutrition-v3b-macro">
            <div className="nutrition-v3b-macro-top">
              <span><b>{abbr}</b> {label}</span>
              <strong>{num(amount)} <small>/ {goal !== null ? num(goal) : "—"} g</small></strong>
            </div>
            <GlassProgress label={label+"攝取進度"} value={amount} target={goal} />
            {exceeded && <small className="nutrition-v3b-over">超出 {num(amount-goal)} g</small>}
          </div>;
        })}
      </div>
    </div>
    <div className="nutrition-v3b-footer">
      <div className="nutrition-v3b-status">
        <Utensils size={15} aria-hidden="true" />
        {meals.length ? `今日 ${meals.length} 筆飲食紀錄` : "今天尚未記錄飲食"}
      </div>
      <GlassButton kind="primary" className="nutrition-v3b-add" onClick={onAddMeal}>
        <Plus size={17} aria-hidden="true" /> 加入飲食
      </GlassButton>
    </div>
    {!target && (
      <UiEmptyState title="尚未設定營養目標" description="設定目標後，這裡會呈現實際攝取與剩餘熱量。"
        action={<Link href="/onboarding" className="jfs-ui-action jfs-ui-action--secondary">設定營養目標 <ArrowRight size={15} /></Link>}
      />
    )}
  </GlassCard>;
}
