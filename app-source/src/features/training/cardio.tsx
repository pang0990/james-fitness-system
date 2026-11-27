"use client";
import Link from "next/link";
import { Activity } from "lucide-react";
import { useStore } from "@/lib/store";

import {
  Heading,
  Card,
  Empty,
  Field,
  NumberField,
} from "@/components/ui/page-content";
import { uid as id, stamp as now } from "@/components/daily";
export function Cardio({
  date,
  notify,
}: {
  date: string;
  notify: (m?: string) => void;
}) {
  const { state, save } = useStore();
  return (
    <>
      <Heading
        eyebrow="TRAIN WITH INTENTION"
        title="Cardio"
        description="有氧運動以手動輸入的實際數值保存，不自動將消耗加回可吃熱量。"
      />
      <Link href="/training" className="text-link">
        ← Training
      </Link>

      <div className="dashboard-grid">
        <Card title="手動記錄有氧" icon={Activity}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              if (
                save("新增 Cardio", (s) =>
                  s.cardio.push({
                    id: id(),
                    date: String(d.get("date")),
                    type: String(d.get("type")),
                    minutes: Number(d.get("minutes")),
                    calories:
                      d.get("calories") === ""
                        ? null
                        : Number(d.get("calories")),
                    caloriesSource:
                      String(d.get("caloriesSource")) === "machine"
                        ? "machine"
                        : "manual",
                    distanceKm:
                      d.get("distanceKm") === ""
                        ? undefined
                        : Number(d.get("distanceKm")),
                    avgHeartRate:
                      d.get("avgHeartRate") === ""
                        ? undefined
                        : Number(d.get("avgHeartRate")),
                    source: "manual",
                    createdAt: now(),
                  }),
                )
              ) {
                notify();
                e.currentTarget.reset();
              }
            }}
          >
            <div className="form-grid">
              <Field label="日期">
                <input
                  name="date"
                  type="date"
                  defaultValue={date}
                  max={date}
                  required
                />
              </Field>
              <Field label="類型">
                <select name="type">
                  <option>快走</option>
                  <option>跑步</option>
                  <option>腳踏車</option>
                  <option>其他</option>
                </select>
              </Field>
              <NumberField
                name="minutes"
                label="時長 分鐘"
                min={1}
                max={1440}
                step="1"
              />
              <NumberField
                name="distanceKm"
                label="距離 km（選填）"
                min={0}
                max={1000}
                step="0.01"
                required={false}
              />
              <NumberField
                name="avgHeartRate"
                label="平均心率 bpm（選填）"
                min={30}
                max={250}
                step="1"
                required={false}
              />
              <NumberField
                name="calories"
                label="消耗 kcal（選填）"
                min={0}
                max={10000}
                required={false}
              />
              <Field label="消耗數值來源">
                <select name="caloriesSource" defaultValue="manual">
                  <option value="manual">自行填入</option>
                  <option value="machine">器材數值</option>
                </select>
              </Field>
            </div>
            <div className="form-actions">
              <button className="button">保存紀錄</button>
            </div>
          </form>
          <p className="muted" style={{ marginTop: 20, fontSize: 11 }}>
            消耗只作活動紀錄，不加回可吃熱量。
          </p>
        </Card>
        <Card title="活動歷史">
          {state.cardio.length ? (
            state.cardio
              .slice()
              .reverse()
              .map((c) => (
                <div className="list-row" key={c.id}>
                  <div className="grow">
                    <h3>
                      {c.type} · {c.minutes} 分鐘
                    </h3>
                    <p>
                      {c.date} · {c.calories ?? "未填"} kcal（
                      {c.caloriesSource === "machine"
                        ? "器材"
                        : c.caloriesSource === "manual"
                          ? "手動"
                          : "舊紀錄未標示"}
                      ）
                      {c.distanceKm !== undefined
                        ? ` · ${c.distanceKm} km`
                        : ""}
                      {c.avgHeartRate !== undefined
                        ? ` · ${c.avgHeartRate} bpm`
                        : ""}
                    </p>
                  </div>
                </div>
              ))
          ) : (
            <Empty title="尚無有氧紀錄" detail="記下時間，就從這裡開始。" />
          )}
        </Card>
      </div>
    </>
  );
}
