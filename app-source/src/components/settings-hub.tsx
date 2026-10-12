"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { frequencies, profileSchema } from "@/lib/domain";
import { AppearanceSettings } from "./appearance";
import { PageTitle, Field } from "./daily";
import pkg from "../../package.json";
const pages = {
  profile: "Profile",
  body: "Body & Goal",
  nutrition: "Nutrition",
  training: "Training",
  recovery: "Recovery",
  appearance: "Appearance",
  notifications: "Notifications",
  accessibility: "Accessibility",
  account: "Account & Sync",
  data: "Data",
  privacy: "Privacy",
  about: "About",
};
type Definition = [string, string, string, string?];
const fields: Record<string, Definition[]> = {
  profile: [
    ["name", "稱呼", "text"],
    ["age", "年齡", "number"],
    ["sex", "計算使用性別", "male:男性|female:女性"],
    ["language", "介面語言（目前提供繁體中文）", "zh-Hant:繁體中文"],
    ["region", "地區", "text", "Taiwan"],
    ["timezone", "時區", "text", "Asia/Taipei"],
    ["weekStart", "每週起始日", "1:星期一|0:星期日"],
    ["timeFormat", "時間格式", "24:24 小時|12:12 小時"],
  ],
  body: [
    ["height", "身高 cm", "number"],
    ["weight", "目前體重 kg", "number"],
    ["bodyFat", "體脂率 %（選填）", "number"],
    ["goal", "目標", "CUT:CUT|GAIN:GAIN"],
    ["goalStartDate", "目標起始日", "date"],
  ],
  nutrition: [
    ["eatingStyle", "飲食方式", "mixed:混合|out:外食|home:自煮"],
    ["restrictions", "飲食限制", "text"],
    ["allergies", "食物過敏", "text"],
    ["avoidFoods", "避吃食物", "text"],
    ["waterTarget", "每日飲水目標 ml", "number"],
    ["waterQuick1", "飲水快捷量 1 ml", "number", "250"],
    ["waterQuick2", "飲水快捷量 2 ml", "number", "500"],
  ],
  training: [
    ["environment", "訓練環境", "gym:Gym"],
    ["experience", "訓練經驗", "beginner:初學|intermediate:中階|advanced:進階"],
    [
      "frequency",
      "每週訓練量（Numbers 計算輸入）",
      frequencies.map((v, i) => i + ":" + v).join("|"),
    ],
    ["sessionMinutes", "通常訓練分鐘", "number", "60"],
    ["restSeconds", "預設休息秒數", "number", "120"],
    ["autoRest", "工作組後自動休息計時", "checkbox", "true"],
    ["keepAwake", "訓練時保持螢幕開啟", "checkbox", "true"],
    ["showPrevious", "顯示前次表現", "checkbox", "true"],
    ["showRIR", "顯示 RIR 輸入", "checkbox", "true"],
    ["warmupDefault", "暖身預設", "ask:開始時詢問|skip:直接進入訓練"],
    ["allowRestPause", "可使用 Rest-Pause", "checkbox", "true"],
    ["allowDropSet", "可使用 Drop Set", "checkbox", "true"],
  ],
  recovery: [
    ["trackSleep", "睡眠", "checkbox", "true"],
    ["trackFatigue", "疲勞", "checkbox", "true"],
    ["trackStress", "壓力", "checkbox", "true"],
    ["trackSoreness", "痠痛", "checkbox", "true"],
  ],
  notifications: [["reminders", "最近三天資料提醒", "checkbox", "true"]],
  accessibility: [
    ["reduceMotion", "減少動態（也尊重系統設定）", "checkbox", "false"],
    ["reduceTransparency", "減少透明效果", "checkbox", "false"],
  ],
};
export function SettingsHub({
  path,
  notify,
}: {
  path: string;
  notify: (s?: string) => void;
}) {
  const { state, save } = useStore();
  const key = path.split("/")[1];
  if (!key)
    return (
      <div className="daily-page">
        <PageTitle title="Settings" />
        {Object.entries(pages).map(([k, label]) => (
          <Link className="simple-row" href={"/settings/" + k} key={k}>
            {label}
            <span>→</span>
          </Link>
        ))}
      </div>
    );
  if (key === "appearance") return <AppearanceSettings notify={notify} />;
  if (key === "account")
    return (
      <div className="daily-page">
        <PageTitle title="Account & Sync" />
        <section className="card">
          <h2>本機使用中</h2>
          <p>不登入即可使用所有日常紀錄。雲端備份與跨裝置同步尚未啟用。</p>
          <Link className="text-link" href="/settings/data">
            備份與資料管理 →
          </Link>
        </section>
      </div>
    );
  if (key === "about")
    return (
      <div className="daily-page">
        <PageTitle title="About" />
        <p>James Fitness System</p>
        <p>Version {pkg.version}</p>
        <p>本機資料 · Web App</p>
        <Link href="/settings/privacy" className="text-link">
          隱私說明 →
        </Link>
      </div>
    );
  const defs = fields[key];
  if (!defs) return null;
  return (
    <div className="daily-page">
      <PageTitle title={pages[key as keyof typeof pages]} />
      <form
        className="card stack"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          if (
            key === "body" &&
            state.profile &&
            data.get("goal") !== state.profile.goal &&
            !confirm("確定切換目標？舊計畫與紀錄保留，營養目標需另行確認。")
          )
            return;
          if (
            save("更新 " + key + " 設定", (s) => {
              const prefs = (s.preferences ??= {});
              const profile = s.profile;
              for (const [name, , type] of defs) {
                const raw = data.get(name);
                const val =
                  type === "checkbox"
                    ? raw === "on"
                    : type === "number" && raw !== ""
                      ? Number(raw)
                      : String(raw ?? "");
                if (
                  profile &&
                  [
                    "name",
                    "age",
                    "height",
                    "weight",
                    "sex",
                    "goal",
                    "frequency",
                    "timezone",
                    "waterTarget",
                  ].includes(name)
                ) {
                  if (name === "goal" && profile.goal !== val)
                    (s.goalHistory ??= []).push({
                      id: crypto.randomUUID(),
                      goal: val as "CUT" | "GAIN",
                      previousGoal: profile.goal,
                      date: new Date().toISOString(),
                    });
                  Object.assign(profile, {
                    [name]: name === "frequency" ? Number(val) : val,
                  });
                } else prefs[name] = val;
              }
              if (profile) {
                profileSchema.parse(profile);
                new Intl.DateTimeFormat("en", { timeZone: profile.timezone });
              }
              for (const name of ["restSeconds", "waterQuick1", "waterQuick2"])
                if (
                  prefs[name] !== undefined &&
                  (!Number.isFinite(Number(prefs[name])) ||
                    Number(prefs[name]) <= 0 ||
                    Number(prefs[name]) > 3600)
                )
                  throw Error("快捷量與休息秒數請填 1–3600");
            })
          )
            notify("已儲存");
        }}
      >
        {!state.profile && ["profile", "body"].includes(key) ? (
          <Link href="/onboarding" className="button">
            完成首次設定
          </Link>
        ) : (
          defs.map(([name, label, type, fallback]) => {
            const val =
              (state.profile as unknown as Record<string, unknown>)?.[name] ??
              state.preferences?.[name] ??
              fallback ??
              "";
            return type === "checkbox" ? (
              <label className="check" key={name}>
                <input
                  type="checkbox"
                  name={name}
                  defaultChecked={String(val) === "true"}
                />
                {label}
              </label>
            ) : (
              <Field label={label} key={name}>
                {type.includes(":") ? (
                  <select name={name} defaultValue={String(val)}>
                    {type.split("|").map((opt) => {
                      const [v, l] = opt.split(":");
                      return (
                        <option value={v} key={v}>
                          {l}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <input
                    name={name}
                    type={type}
                    defaultValue={String(val)}
                    step={type === "number" ? "any" : undefined}
                    required={
                      ![
                        "bodyFat",
                        "goalStartDate",
                        "restrictions",
                        "allergies",
                        "avoidFoods",
                      ].includes(name)
                    }
                  />
                )}
              </Field>
            );
          })
        )}
        {key === "body" && (
          <p className="muted">
            更新目標保留歷史計畫。營養計畫的變更仍需在 Nutrition 預覽並確認。
          </p>
        )}
        <button className="button">儲存設定</button>
      </form>
      {key === "body" &&
        state.goalHistory?.map((g) => (
          <p key={g.id}>
            {g.date.slice(0, 10)} · {g.previousGoal} → {g.goal}
          </p>
        ))}
    </div>
  );
}
