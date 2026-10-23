"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
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
    ["timezone", "時區", "text", "Asia/Taipei"],
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
    ["rpRestSeconds", "RP 短休息秒數（預設 20）", "number", "20"],
    ["autoRest", "完成工作組後自動開始休息（可關閉）", "checkbox", "true"],
    ["keepAwake", "訓練時保持螢幕開啟", "checkbox", "true"],
    ["showPrevious", "顯示前次表現", "checkbox", "true"],
    ["showRir", "訓練時顯示 RIR 輸入（不影響既有歷史）", "checkbox", "true"],
    ["warmupDefault", "暖身預設", "ask:開始時詢問|skip:直接進入訓練"],
    ["allowRestPause", "可使用 Rest-Pause", "checkbox", "true"],
    ["allowDropSet", "可使用 Drop Set", "checkbox", "true"],
  ],
  recovery: [
    ["trackSleep", "睡眠", "checkbox", "true"],
    ["trackFatigue", "疲勞", "checkbox", "true"],
    ["trackStress", "壓力", "checkbox", "true"],
    ["trackSoreness", "痠痛", "checkbox", "true"],
    ["trackPain", "疼痛與安全提醒", "checkbox", "true"],
  ],
  notifications: [
    ["missingLogReminder", "站內缺漏紀錄提醒", "checkbox", "true"],
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
  const { user, signOut } = useAuth();
  const key = path.split("/")[1];
  if (!key)
    return (
      <div className="daily-page settings-index">
        <PageTitle title="設定" />
        <section className="settings-index-group" aria-label="帳號與資料">
          <h2>帳號與資料</h2>
          <Link className="simple-row" href="/settings/account">Google 帳號 <span>›</span></Link>
          <Link className="simple-row" href="/settings/data-privacy">資料與隱私 <span>›</span></Link>
        </section>
        <section className="settings-index-group" aria-label="個人化">
          <h2>個人化</h2>
          <Link className="simple-row" href="/settings/appearance">外觀風格 <span>›</span></Link>
          <Link className="simple-row" href="/settings/general">一般設定 <span>›</span></Link>
          <Link className="simple-row" href="/settings/accessibility">輔助使用 <span>›</span></Link>
        </section>
        <section className="settings-index-group" aria-label="健身偏好">
          <h2>健身偏好</h2>
          <Link className="simple-row" href="/settings/nutrition">營養與飲水 <span>›</span></Link>
          <Link className="simple-row" href="/settings/training">訓練 <span>›</span></Link>
           <Link className="simple-row" href="/settings/recovery">恢復與疼痛紀錄偏好 <span>›</span></Link>
          <Link className="simple-row" href="/settings/notifications">站內提醒 <span>›</span></Link>
        </section>
        <div className="settings-index-footer">
          <Link href="/settings/about">關於 JFS · v{pkg.version} ›</Link>
        </div>
      </div>
    );
  if (key === "appearance") return <div className="daily-page"><PageTitle title="外觀" /><AppearanceSettings notify={notify} /><Link className="text-link" href="/settings/companion">2077 角色與城市進階設定 →</Link></div>;
  if (key === "data-privacy")
    return (
      <div className="daily-page">
        <PageTitle title="Data & Privacy" />
        <p className="muted">目前紀錄只儲存在這個瀏覽器，尚未啟用雲端同步。</p>
        <Link className="simple-row" href="/settings/data">備份、匯出與資料管理 <span>›</span></Link>
        <Link className="simple-row" href="/settings/privacy">隱私說明 <span>›</span></Link>
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
            draft.appearance = { theme: draft.appearance?.theme ?? "light", visualStyle: draft.appearance?.visualStyle ?? "minimal", showCompanion: data.get("character") === "on" };
            (draft.preferences ??= {}).companionAnimation = data.get("animation") === "on";
            (draft.preferences ??= {}).cityAnimation = data.get("cityAnimation") === "on";
          })) notify("角色偏好已儲存");
        }}>
          <label className="check"><input name="character" type="checkbox" defaultChecked={state.appearance?.showCompanion !== false} />顯示角色</label>
          <label className="check"><input name="animation" type="checkbox" defaultChecked={state.preferences?.companionAnimation !== false} />持續動畫（減少動態設定優先）</label>
          <label className="check"><input name="cityAnimation" type="checkbox" defaultChecked={state.preferences?.cityAnimation !== false} />Today 動態城市（霓虹、空中交通、雨霧）</label>
          <p className="muted">城市動畫僅用於 2077 風格，減少動態設定會優先生效。</p>
          <button className="button">儲存偏好</button>
        </form>
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
          <h2>Google 帳號</h2>
          <p>{user?.email ?? "尚未登入"}</p>
          <p className="muted">已登入。健身紀錄仍儲存在本機，尚未跨裝置同步。</p>
          <button className="button secondary" type="button" onClick={() => void signOut()}>登出 Google 帳號</button>
        </section>
      </div>
    );
  if (key === "about")
    return (
      <div className="daily-page">
        <PageTitle title="About" />
        <p>James Fitness System</p>
        <p>Version {pkg.version}</p>
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
              }
              for (const name of ["restSeconds", "rpRestSeconds", "waterQuick1", "waterQuick2"])
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
        {key === "training" && <div className="stack">
          <p className="muted">這裡只管理長期訓練偏好。訓練日、模板、動作與個別 Session 請在 Training 工作區編輯；模板不是必填限制。</p>
          <Link href="/training/plan" className="button secondary">編輯訓練課表 →</Link>
          <Link href="/training/calendar" className="text-link">管理訓練日曆 →</Link>
        </div>}
        {key === "notifications" && (
          <p className="muted">目前僅支援 App 內提醒，尚未提供系統推播。</p>
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
