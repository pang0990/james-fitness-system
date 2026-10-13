"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { frequencies, profileSchema } from "@/lib/domain";
import { AppearanceSettings } from "./appearance";
import { PageTitle, Field } from "./daily";
import pkg from "../../package.json";
const pages = {
  account: "Account & Sync",
  health: "Apple Health · 健康資料",
  general: "General · 一般設定",
  appearance: "Appearance · 外觀",
  notifications: "Notifications · 提醒",
  training: "Training · 訓練",
  nutrition: "Nutrition · 營養",
  companion: "Companion · 角色",
  accessibility: "Accessibility · 無障礙",
  "data-privacy": "Data & Privacy · 資料與隱私",
  about: "About · 關於",
  profile: "Profile",
  body: "Body & Goal",
  recovery: "Recovery",
  data: "Data",
  privacy: "Privacy",
};
type Definition = [string, string, string, string?];
const fields: Record<string, Definition[]> = {
  profile: [
    ["name", "稱呼", "text"],
    ["age", "年齡", "number"],
    ["sex", "計算使用性別", "male:男性|female:女性"],
  ],
  general: [
    ["region", "地區", "text", "Taiwan"],
    ["timezone", "時區", "text", "Asia/Taipei"],
    ["weekStart", "每週起始日", "1:星期一|0:星期日"],
    ["timeFormat", "時間格式", "24:24 小時|12:12 小時"],
  ],
  companion: [
    ["companionAnimation", "角色持續動畫", "checkbox", "true"],
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
  notifications: [
    ["workoutReminder", "訓練提醒（目前只保存偏好，未啟用系統推播）", "checkbox", "false"],
    ["workoutReminderTime", "訓練提醒時間（選擇後才有設定值）", "time", ""],
    ["missingLogReminder", "缺漏紀錄提醒（Today Action Queue）", "checkbox", "true"],
    ["weeklyCheckinReminder", "每週 Check-in 提醒（目前只保存偏好）", "checkbox", "true"],
  ],
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
        {(Object.entries(pages).filter(([k]) => !["profile", "body", "recovery", "data", "privacy"].includes(k))).map(([k, label]) => (
          <Link className="simple-row" href={"/settings/" + k} key={k}>
            {label}
            <span>→</span>
          </Link>
        ))}
      </div>
    );
  if (key === "appearance") return <div className="daily-page"><PageTitle title="Appearance" /><AppearanceSettings notify={notify} /></div>;
  if (key === "data-privacy")
    return (
      <div className="daily-page">
        <PageTitle title="Data & Privacy" />
        <p className="muted">健康與訓練紀錄目前儲存於這台裝置。雲端同步尚未接通，切勿假設已自動備份。</p>
        <Link className="simple-row" href="/data">JSON Backup / Restore / CSV Export <span>→</span></Link>
        <Link className="simple-row" href="/settings/privacy">資料使用與儲存說明 <span>→</span></Link>
        <Link className="simple-row" href="/settings/data">清除目前裝置資料 <span>→</span></Link>
      </div>
    );
  if (key === "companion")
    return (
      <div className="daily-page">
        <PageTitle title="Companion" />
        <form className="card stack" onSubmit={e => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          if (save("更新角色設定", draft => {
            draft.appearance = { theme: draft.appearance?.theme ?? "dark", showCompanion: data.get("character") === "on" };
            (draft.preferences ??= {}).companionAnimation = data.get("animation") === "on";
          })) notify("角色偏好已儲存");
        }}>
          <label className="check"><input name="character" type="checkbox" defaultChecked={state.appearance?.showCompanion !== false} />顯示角色</label>
          <label className="check"><input name="animation" type="checkbox" defaultChecked={state.preferences?.companionAnimation !== false} />持續動畫（減少動態設定優先）</label>
          <p className="muted">Today 目前使用電影感靜態示意背景。角色顯示偏好會保留，待正式 3D 模型接入後完整套用；此選項不代表 3D 已實作。</p>
          <button className="button">儲存偏好</button>
        </form>
        <Link className="text-link" href="/settings/accessibility">無障礙與減少動態 →</Link>
      </div>
    );
  if (key === "health")
    return <div className="daily-page">
      <PageTitle title="Apple Health" />
      <section className="card stack">
        <p className="eyebrow">FUTURE INTEGRATION</p>
        <h2>尚未連接 Apple 健康</h2>
        <p>目前 Web 版無法直接使用 iPhone 的 HealthKit 資料。步數與有氧活動請先在 Today 手動記錄。</p>
        <p className="muted">日後 iOS App 可在取得授權後匯入步數與運動紀錄；授權前不會讀取資料，且不會把活動熱量自動加回飲食目標。</p>
        <Link href="/today" className="button secondary">前往 Today 活動紀錄</Link>
      </section>
    </div>;
  if (key === "account")
    return (
      <div className="daily-page">
        <PageTitle title="Account & Sync" />
        <section className="card">
          <h2>帳號與同步尚未啟用</h2>
          <p>正式規格採 Google 登入且不提供訪客模式；但目前公開的 GitHub Pages 仍是本機資料版本，尚未接通 Google OAuth、使用者帳號或雲端同步。</p>
          <p className="muted">在驗證雲端資料隔離與遷移前，先保留既有本機操作，避免鎖住目前使用者或遺失資料。這裡不會顯示虛假的「已同步」。</p>
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
        <p>本機紀錄版 · Web App（Google 登入／Cloud Sync 尚待整合）</p>
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
              if (key === "notifications") {
                prefs.reminders = prefs.missingLogReminder !== false;
                if (prefs.workoutReminder === true && !prefs.workoutReminderTime)
                  throw Error("開啟訓練提醒前請設定提醒時間");
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
                        "workoutReminderTime",
                      ].includes(name)
                    }
                  />
                )}
              </Field>
            );
          })
        )}
        {key === "general" && (
          <p className="muted">第一版單位固定 kg／cm，日期格式 YYYY/MM/DD，介面目前僅完整支援繁體中文；英文版列為後續內容工作，不提供無效的語言切換。時間格式與每週起始日為偏好設定，尚未全面套用到所有歷史圖表。</p>
        )}
        {key === "notifications" && (
          <p className="muted">設定僅代表提醒偏好。瀏覽器系統推播仍需正式通知服務及使用者授權；Today 站內缺漏提醒可立即使用。</p>
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
