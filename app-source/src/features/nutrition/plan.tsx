"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { activePlan, frequencies } from "@/lib/domain";

import {
  Heading,
  Card,
  Empty,
  TargetTable,
} from "@/components/ui/page-content";
function NutritionLinks({ path }: { path: string }) {
  return (
    <Link href="/nutrition" className="text-link">
      ← Nutrition
    </Link>
  );
}

export function Nutrition({
  path,
  date,
  notify,
}: {
  path: string;
  date: string;
  notify: (m?: string) => void;
}) {
  const { state } = useStore();
  const plan = activePlan(state, date);
  return (
    <div className="daily-page">
      <Heading
        eyebrow=""
        title={path === "nutrition/plan" ? "營養計畫" : "食譜"}
      />
      <NutritionLinks path={path} />
      {path === "nutrition/plan" ? (
        plan ? (
          <Card title={`目前計畫 · ${plan.inputs.goal}`}>
            <TargetTable targets={plan.targets} />
            <p className="muted" style={{ marginTop: 20 }}>
              v{plan.number} · {plan.effectiveDate} 生效
            </p>
            <Link className="text-link" href="/nutrition">
              查看今日營養
              <ArrowRight size={16} />
            </Link>
            <details className="source-details">
              <summary>計算依據</summary>
              <p>
                依已確認的個人資料與 James 計算規則建立。計算用體重{" "}
                {plan.inputs.weight} kg；{frequencies[plan.inputs.frequency]}。
              </p>
              <Link href="/progress/history">計畫變更紀錄</Link>
            </details>
          </Card>
        ) : (
          <Card>
            <Empty
              title={
                state.profile?.goal === "GAIN"
                  ? "GAIN 基準追蹤中"
                  : "尚未設定營養目標"
              }
              detail={
                state.profile?.goal === "GAIN"
                  ? "先記錄實際飲食與體重。"
                  : "完成基本資料並確認計畫後，目標會顯示於今日營養。"
              }
              href="/onboarding"
              action="設定營養目標"
            />
          </Card>
        )
      ) : (
        <Card>
          <Empty
            title="尚未新增食譜"
            detail="目前可以從食物庫記錄每餐食材。"
            href="/nutrition/foods"
            action="選擇食物"
          />
        </Card>
      )}
    </div>
  );
}
