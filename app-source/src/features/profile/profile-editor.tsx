"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  createInitialPlan,
  cutTargets,
  dateInZone,
  frequencies,
  profileSchema,
  round,
  type Profile,
} from "@/lib/domain";

import {
  Heading,
  Card,
  Field,
  NumberField,
  TargetTable,
} from "@/components/ui/page-content";
import { uid as id, stamp as now } from "@/components/daily";
export function Onboarding({
  editing,
  notify,
}: {
  editing: boolean;
  notify: (m?: string) => void;
}) {
  const { state, save } = useStore();
  const router = useRouter();
  const p = state.profile;
  const [preview, setPreview] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const parsed = profileSchema.safeParse({
      name: d.get("name"),
      age: Number(d.get("age")),
      height: Number(d.get("height")),
      weight: Number(d.get("weight")),
      sex: d.get("sex"),
      frequency: Number(d.get("frequency")),
      experiencedCut: d.get("experienced") === "yes",
      goal: d.get("goal"),
      eligible: d.get("eligible") === "on",
      timezone: "Asia/Taipei",
      waterTarget: Number(d.get("waterTarget") || 0),
    });
    if (!parsed.success) {
      setError("請完整填寫有效的成人基本資料。");
      return;
    }
    setPreview({
      ...parsed.data,
      bodyFat: p?.bodyFat,
      resistanceDays: p?.resistanceDays,
      safety: p?.safety,
      eligible:
        parsed.data.eligible &&
        parsed.data.age >= 18 &&
        !(parsed.data.goal === "CUT" && parsed.data.frequency < 0) &&
        !Object.values(p?.safety ?? {}).some(Boolean),
    });
    setError("");
  }
  function confirm() {
    if (!preview) return;
    const date = dateInZone(preview.timezone);
    if (
      save(editing ? "更新個人資料" : "完成初始設定", (s) => {
        s.profile = preview;
        if (!editing && !s.measurements.length)
          s.measurements.push({
            id: id(),
            date,
            weight: preview.weight,
            createdAt: now(),
          });
        if (!s.versions.length && preview.goal === "CUT" && preview.eligible)
          createInitialPlan(s, date, id(), now());
      })
    ) {
      notify();
      router.push("/today");
    }
  }
  return (
    <>
      <Heading
        eyebrow={editing ? "YOUR PROFILE" : "LET’S BEGIN"}
        title={editing ? "個人資料" : "設定營養目標"}
      />
      <div className="narrow">
        <Card>
          {!preview ? (
            <form onSubmit={submit}>
              <p className="step-label">
                {
                  ["1 / 3 基本資料", "2 / 3 目標與運動", "3 / 3 飲水與確認"][
                    step
                  ]
                }
              </p>
              <div className="onboarding-step">
                {[0, 1, 2].map((i) => (
                  <span key={i} className={i <= step ? "active" : ""} />
                ))}
              </div>
              <div className="form-grid onboarding-grid" data-step={step}>
                <Field label="稱呼">
                  <input
                    name="name"
                    required
                    maxLength={40}
                    defaultValue={p?.name}
                    placeholder="希望怎麼稱呼你？"
                  />
                </Field>
                <NumberField
                  label="年齡（未滿 18 歲僅提供 Tracking Only）"
                  name="age"
                  min={1}
                  max={100}
                  step="1"
                  value={p?.age}
                />
                <NumberField
                  label="身高 cm"
                  name="height"
                  min={100}
                  max={250}
                  value={p?.height}
                />
                <NumberField
                  label="目前體重 kg"
                  name="weight"
                  min={30}
                  max={350}
                  value={p?.weight}
                />
                <Field label="Numbers 計算預設">
                  <select name="sex" defaultValue={p?.sex ?? "male"}>
                    <option value="male">男性預設</option>
                    <option value="female">女性預設</option>
                  </select>
                </Field>
                <Field label="每週運動時長／頻率">
                  <select name="frequency" defaultValue={p?.frequency ?? -1}>
                    <option value={-1}>
                      無法配對／未確定（Tracking Only）
                    </option>
                    {frequencies.map((f, i) => (
                      <option key={f} value={i}>
                        {f}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="目前目標">
                  <select name="goal" defaultValue={p?.goal ?? "CUT"}>
                    <option value="CUT">CUT · 減脂</option>
                    <option value="GAIN">GAIN · 增肌（先記錄 Baseline）</option>
                  </select>
                </Field>
                <Field label="是否有減脂基礎">
                  <select
                    name="experienced"
                    defaultValue={p?.experiencedCut ? "yes" : "no"}
                  >
                    <option value="no">沒有，第一次減脂</option>
                    <option value="yes">有減脂／健身基礎</option>
                  </select>
                </Field>
                <NumberField
                  label="自己設定的飲水目標 ml（選填）"
                  name="waterTarget"
                  min={0}
                  max={10000}
                  step="50"
                  required={false}
                  value={p?.waterTarget || ""}
                />
                <div className="full">
                  <label className="check">
                    <input
                      type="checkbox"
                      name="eligible"
                      defaultChecked={p?.eligible ?? false}
                    />
                    <span>
                      我是成人，且沒有需要專業人員個別設定飲食的情況（例如孕哺期、飲食疾患或特定疾病飲食）。未勾選仍可記錄，不建立營養處方。
                    </span>
                  </label>
                </div>
              </div>
              <div className="form-actions">
                {step > 0 && (
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setStep(step - 1)}
                  >
                    上一步
                  </button>
                )}
                {step < 2 ? (
                  <button
                    className="button"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget.form!;
                      const visible = Array.from(
                        form.querySelectorAll<HTMLInputElement>(
                          ".onboarding-grid input",
                        ),
                      ).filter((i) => i.offsetParent !== null);
                      if (visible.every((i) => i.reportValidity()))
                        setStep(step + 1);
                    }}
                  >
                    下一步
                  </button>
                ) : (
                  <button key="preview" className="button" type="submit">
                    查看資料與計畫預覽
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
            </form>
          ) : (
            <>
              <p className="step-label">02 / 確認你的起點</p>
              <div
                className="stats-grid"
                style={{ gridTemplateColumns: "repeat(3,1fr)" }}
              >
                <div className="stat">
                  <small>體重</small>
                  <strong>{preview.weight}</strong>
                  <small>kg</small>
                </div>
                <div className="stat">
                  <small>BMI</small>
                  <strong>
                    {round(preview.weight / (preview.height / 100) ** 2)}
                  </strong>
                  <small>資料摘要，非診斷</small>
                </div>
                <div className="stat">
                  <small>目標</small>
                  <strong>{preview.goal}</strong>
                  <small>你目前的方向</small>
                </div>
              </div>
              {editing && state.versions.length ? (
                <div className="notice">
                  更新個人資料不會改寫目前計畫。營養計畫仍保留原本的輸入與版本。
                </div>
              ) : preview.goal === "CUT" && preview.eligible ? (
                <>
                  <TargetTable targets={cutTargets(preview)} />
                  <div className="notice" style={{ marginTop: 20 }}>
                    依 Numbers 3.0，使用實際體重 {preview.weight} kg
                    計算。確認後建立
                    v1，今天生效。尚未加入未核定的額外熱量安全門檻。
                  </div>
                </>
              ) : (
                <div className="notice">
                  {preview.goal === "GAIN"
                    ? "GAIN 先進入 Baseline Tracking，記錄飲食、體重與訓練；尚不自動推算維持熱量或增加攝取。"
                    : "目前啟用紀錄模式，不建立自動營養目標。"}
                </div>
              )}
              <div className="form-actions">
                <button
                  className="button secondary"
                  onClick={() => setPreview(null)}
                >
                  返回修改
                </button>
                <button className="button" onClick={confirm}>
                  {editing ? "確認更新資料" : "確認並開始"}
                  <Check size={14} />
                </button>
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
