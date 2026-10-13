"use client";
import { AppearanceSettings } from "./appearance";
import { OnboardingWizard } from "./onboarding-wizard";
import { WorkoutHistoryDetail, ExerciseGuideDetail, ExerciseProgressDetail } from "./detail-pages";
import { SettingsHub } from "./settings-hub";
import { MealSettings } from "./meal-settings";
import { DataTools } from "./data-tools";
import { RecoveryHistory, RecoveryEntryPoints } from "./recovery-log";
import { MetricDetails } from "./trends";
import { TrainingReview } from "./training-review";
import { GainReview } from "./gain-review";
import { Recipes } from "./recipes";
import { ProgressDirection } from "./progress-direction";
import { ActivityReviewContext } from "./activity-trend";
import { WeeklyCheckin } from "./weekly-checkin";
import Link from "next/link";
import { NutritionV2 } from "./daily";
import { TodayReference } from "./today-reference";
import { TrainingFlow } from "./training-flow";
import { Trends } from "./trends";
import { Knowledge } from "./knowledge";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  Bell,
  Menu as MenuIcon,
  ArrowDownRight,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Droplet,
  Dumbbell,
  Flame,
  History,
  Home,
  Leaf,
  LockKeyhole,
  Plus,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Trash2,
  TrendingUp,
  User,
  Utensils,
  ArrowUpRight,
  Download,
  Info,
} from "lucide-react";
import { useStore, STORAGE_KEY } from "@/lib/store";
import {
  activityEvidenceForReview,
  activePlan,
  addDays,
  createInitialPlan,
  cutReview,
  cutTargets,
  dateInZone,
  dayNames,
  daysBetween,
  decide,
  frequencies,
  mealTotals,
  pinDay,
  profileSchema,
  resolveDay,
  round,
  RULE_ID,
  setDayType,
  visibleMeals,
  visibleMeasurements,
  waterTotal,
  type AppState,
  type DayType,
  type Food,
  type Macros,
  type Profile,
  type Recommendation,
  type Segment,
} from "@/lib/domain";
import sourceFoods from "@/content/foods.json";

const nav = [
  { path: "today", label: "Today", zh: "今日", icon: Home },
  { path: "nutrition", label: "Nutrition", zh: "飲食", icon: Utensils },
  { path: "training", label: "Training", zh: "訓練", icon: Dumbbell },
  { path: "progress", label: "Progress", zh: "進度", icon: Activity },
];
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const labelMap: Record<string, string> = {
  today: "Today",
  nutrition: "Nutrition",
  training: "Training",
  progress: "Progress",
  learn: "Knowledge",
  profile: "Profile",
  settings: "Settings",
  onboarding: "Get started",
  login: "Welcome",
  signup: "Welcome",
};
function Heading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
function Card({
  title,
  kicker,
  icon: Icon,
  link,
  children,
  className = "",
}: {
  title?: string;
  kicker?: string;
  icon?: typeof Home;
  link?: { href: string; label: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="card-head">
          <div>
            <p className="section-kicker">{kicker}</p>
            <div className="card-title">
              {Icon && <Icon size={17} />}
              <h2>{title}</h2>
            </div>
          </div>
          {link && (
            <Link className="text-link" href={link.href}>
              {link.label}
              <ArrowUpRight size={13} />
            </Link>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
function Empty({
  title,
  detail,
  href,
  action,
}: {
  title: string;
  detail: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="empty">
      <Leaf size={27} />
      <h3>{title}</h3>
      <p>{detail}</p>
      {href && (
        <Link className="button secondary small" href={href}>
          {action ?? "開始設定"}
          <ArrowRight size={13} />
        </Link>
      )}
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function NumberField({
  label,
  name,
  value,
  min = 0,
  max = 10000,
  step = "0.1",
  required = true,
}: {
  label: string;
  name: string;
  value?: number | string;
  min?: number;
  max?: number;
  step?: string;
  required?: boolean;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        name={name}
        defaultValue={value}
        min={min}
        max={max}
        step={step}
        required={required}
      />
    </Field>
  );
}
function DateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (date: string) => void;
}) {
  return (
    <input
      className="control"
      aria-label="紀錄日期"
      type="date"
      value={value}
      max={dateInZone()}
      onChange={(e) => {
        if (e.target.value) onChange(e.target.value);
      }}
    />
  );
}
function MacrosView({
  eaten,
  target,
}: {
  eaten: Macros;
  target: Macros | null;
}) {
  return (
    <>
      <div className="metric-row">
        {(["p", "c", "f"] as const).map((k, i) => (
          <div className="metric" key={k}>
            <div className="metric-label">
              {["PROTEIN 蛋白質", "CARBS 碳水", "FAT 脂肪"][i]}
            </div>
            <div className="metric-number">
              {eaten[k]}
              <small>/ {target ? target[k] : "—"} g</small>
            </div>
            <div className="track">
              <span
                style={{
                  width: `${target && target[k] > 0 ? Math.min(100, (eaten[k] / target[k]) * 100) : 0}%`,
                }}
              />
            </div>
            <div className="metric-note">
              {target
                ? eaten[k] > target[k]
                  ? `超出 ${round(eaten[k] - target[k])} g`
                  : `剩餘 ${round(target[k] - eaten[k])} g`
                : "尚未設定目標"}
            </div>
          </div>
        ))}
      </div>
      <div className="calorie-line">
        <span className="muted">參考熱量</span>
        <span>
          <strong>{eaten.kcal.toLocaleString()}</strong>{" "}
          <span className="muted">
            / {target?.kcal.toLocaleString() ?? "—"} kcal
          </span>
        </span>
      </div>
    </>
  );
}
function NutritionLinks({ path }: { path: string }) {
  return (
    <Link href="/nutrition" className="text-link">
      ← Nutrition
    </Link>
  );
}
function ProgressLinks({ path }: { path: string }) {
  return (
    <Link href="/progress" className="text-link">
      ← Progress
    </Link>
  );
}

export function FitnessApp({ path }: { path: string }) {
  const { state, ready, error, saving } = useStore();
  const section = path.split("/")[0];
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  const notify = (message = "已儲存") => setToast(message);
  const date = dateInZone(state.profile?.timezone);
  return (
    <div
      className={
        path === "training/session"
          ? `app page-${section} workout-active`
          : `app page-${section}`
      }
    >
      <aside className="sidebar">
        <Link href="/today" className="brand">
          <div className="brand-mark">J</div>
          <div>
            <strong>JAMES</strong>
            <small>FITNESS SYSTEM</small>
          </div>
        </Link>

        <nav>
          {nav.map((n) => (
            <Link
              className={`nav-item ${section === n.path ? "active" : ""}`}
              href={"/" + n.path}
              key={n.path}
              aria-label={n.label}
              title={n.label}
            >
              <n.icon size={17} />
              <span className="rail-label">{n.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="breadcrumb" aria-label="目前所在頁面">
            {section === "today" ? (
              <div className="today-header-brand">
                <span className="wordmark">JAMES FITNESS</span>
                <span className="today-header-subtitle">THE WANDERER</span>
              </div>
            ) : (
              <>
                <span className="wordmark">JAMES FITNESS</span>
                <span className="breadcrumb-separator" aria-hidden="true">/</span>
                <span className="current-section">{labelMap[section] ?? "James"}</span>
              </>
            )}
          </div>
          <div className={section === "today" ? "today-header-actions" : ""}>
          {section === "today" && (
            <a className="today-header-bell" href="#today-action-queue" aria-label="查看今日提醒">
              <Bell size={18} />
            </a>
          )}
          <details className="account-menu">
            <summary aria-label="帳戶選單">
              {section === "today" ? <MenuIcon size={20} /> : <User size={20} />}
            </summary>
            <div>
              <Link href="/profile">Profile · 個人資料</Link>
              <Link href="/knowledge">Knowledge · 知識庫</Link>
              <Link href="/data">Data & Backup · 資料管理</Link>
              <Link href="/settings">Settings · 系統設定</Link>
            </div>
          </details>
          </div>
        </header>
        {saving && (
          <div className="save-indicator" role="status">
            儲存中…
          </div>
        )}
        {error && (
          <div className="notice error" role="alert">
            {error} <Link href="/settings/data">資料管理 →</Link>
          </div>
        )}
        {!ready ? (
          <div className="loading" role="status" aria-label="正在讀取本機資料">
            <span className="loading-mark">J</span>
            <div className="loading-line" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        ) : (
          <div key={path}>
            {path.includes("/") && path !== "training/session" && (
              <Link className="text-link" href={"/" + section}>
                ← {section === "settings" ? "Settings" : section}
              </Link>
            )}
            {section === "onboarding" ? (
              <OnboardingWizard path={path} notify={notify} />
            ) : section === "profile" ? (
              <Onboarding editing notify={notify} />
            ) : section === "login" || section === "signup" ? (
              <Login />
            ) : section === "today" ? (
              <TodayReference date={date} notify={notify} />
            ) : section === "nutrition" ? (
              path === "nutrition/meals" ? (
                <MealSettings notify={notify} />
              ) : path === "nutrition/plan" &&
                state.profile?.goal === "GAIN" ? (
                <GainReview date={date} notify={notify} />
              ) : path === "nutrition/recipes" || path === "nutrition/recipes/detail" ? (
                <Recipes path={path} date={date} notify={notify} />
              ) : ["nutrition", "nutrition/log", "nutrition/foods"].includes(
                  path,
                ) ? (
                <NutritionV2 path={path} date={date} notify={notify} />
              ) : (
                <Nutrition path={path} date={date} notify={notify} />
              )
            ) : section === "training" ? (
              path === "training/history/session" ? (
                <WorkoutHistoryDetail />
              ) : path === "training/exercises/detail" ? (
                <ExerciseGuideDetail />
              ) : path === "training/activity" ? (
                <Training path={path} date={date} notify={notify} />
              ) : (
                <TrainingFlow path={path} date={date} notify={notify} />
              )
            ) : section === "progress" ? (
              path === "progress/check-in" ? (
                <WeeklyCheckin date={date} />
              ) : path === "progress/training/exercises" ? (
                <ExerciseProgressDetail />
              ) : [
                "progress/review",
                "progress/weekly",
                "progress/recommendations",
              ].includes(path) ? (
                <div className="daily-page">
                  <ActivityReviewContext date={date} />
                  {state.profile?.goal === "GAIN" ? (
                    <GainReview date={date} notify={notify} />
                  ) : (
                    <>
                      <Heading eyebrow="" title="Progress Review" />
                      <Recommendations date={date} notify={notify} />
                      <Link className="text-link" href="/progress/history">
                        Previous decisions →
                      </Link>
                    </>
                  )}
                  <TrainingReview date={date} />
                </div>
              ) : path === "progress/recovery" ? (
                <div className="daily-page">
                  <Heading eyebrow="" title="Recovery" />
                  <RecoveryEntryPoints date={date} editableDate />
                  <RecoveryHistory />
                  <MetricDetails date={date} group="recovery" />
                </div>
              ) : path === "progress" ? (
                <ProgressDirection date={date} />
              ) : (
                <>
                  <Progress path={path} date={date} notify={notify} />
                  {["body", "nutrition", "training", "recovery"].includes(
                    path.split("/")[1],
                  ) && <MetricDetails date={date} group={path.split("/")[1]} />}
                </>
              )
            ) : section === "learn" || section === "knowledge" ? (
              <Knowledge path={path.replace(/^knowledge/, "learn")} />
            ) : section === "auth" ? (
              <div className="daily-page">
                <Heading eyebrow="ACCOUNT" title={path==="auth/error"?"登入發生問題":"Google 登入尚未接通"} />
                <p className="muted">目前這個 GitHub Pages 版本沒有連接 Google OAuth 與雲端 Session。請不要在這裡輸入帳號密碼。</p>
                <Link className="button secondary" href="/settings/account">查看帳號系統狀態</Link>
              </div>
            ) : section === "settings" ? (
              ["settings/data", "settings/privacy"].includes(path) ? (
                <SettingsPage path={path} notify={notify} />
              ) : (
                <SettingsHub path={path} notify={notify} />
              )
            ) : null}
          </div>
        )}
        <footer className="page-foot">
          <span>JAMES FITNESS SYSTEM</span>
        </footer>
      </main>
      <nav className="bottom-nav" aria-label="主要導覽">
        {nav.map((n) => (
          <Link
            key={n.path}
            href={"/" + n.path}
            className={section === n.path ? "active" : ""}
          >
            <n.icon size={20} />
            {n.label}
          </Link>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

function Onboarding({
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
      eligible: parsed.data.eligible && parsed.data.age >= 18 &&
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
                    <option value={-1}>無法配對／未確定（Tracking Only）</option>
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
function TargetTable({ targets }: { targets: Record<DayType, Macros> }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>日型</th>
            <th>蛋白質</th>
            <th>碳水</th>
            <th>脂肪</th>
            <th>參考熱量</th>
          </tr>
        </thead>
        <tbody>
          {(Object.keys(dayNames) as DayType[]).map((day) => (
            <tr key={day}>
              <td>{dayNames[day]}</td>
              <td>{targets[day].p} g</td>
              <td>{targets[day].c} g</td>
              <td>{targets[day].f} g</td>
              <td>{targets[day].kcal} kcal</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Login() {
  return (
    <>
      <Heading
        eyebrow="WELCOME"
        title="從這裡開始。"
        description="正式版採 Google 帳號登入；目前公開的是尚未接通 OAuth 的本機過渡版本。"
      />
      <Card className="narrow">
        <LockKeyhole size={27} color="#a48e58" />
        <h2 style={{ margin: "15px 0" }}>你的資料只留在這個瀏覽器</h2>
        <p className="muted">
          Google 登入與雲端同步尚未完成正式設定。這個頁面不收集密碼，也不會假裝成功登入。
        </p>
        <div className="form-actions">
          <Link className="button" href="/onboarding">
            前往本機紀錄版
            <ArrowRight size={14} />
          </Link>
        </div>
      </Card>
    </>
  );
}

function Nutrition({
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

function WaterLog({
  date,
  notify,
}: {
  date: string;
  notify: (m?: string) => void;
}) {
  const { state, save } = useStore();
  const reversed = new Set(state.waters.map((w) => w.reverses));
  return (
    <Card title="飲水紀錄" icon={Droplet}>
      <div className="toolbar">
        <span className="water-number">
          {waterTotal(state, date)} <small>ml</small>
        </span>
        <div className="pill-row">
          {[250, 500].map((ml) => (
            <button
              key={ml}
              onClick={() => {
                if (
                  save("新增飲水", (s) =>
                    s.waters.push({ id: id(), date, ml, createdAt: now() }),
                  )
                )
                  notify();
              }}
            >
              +{ml} ml
            </button>
          ))}
        </div>
      </div>
      {state.waters
        .filter((w) => w.date === date && w.ml > 0 && !reversed.has(w.id))
        .map((w) => (
          <div className="list-row" key={w.id}>
            <span className="grow">{w.ml} ml</span>
            <button
              className="text-link"
              onClick={() => {
                if (
                  save("撤回飲水", (s) => {
                    if (s.waters.some((x) => x.reverses === w.id)) return;
                    s.waters.push({
                      id: id(),
                      date,
                      ml: -w.ml,
                      createdAt: now(),
                      reverses: w.id,
                    });
                  })
                )
                  notify("已撤回這筆飲水");
              }}
            >
              撤回
            </button>
          </div>
        ))}
    </Card>
  );
}

function Training({
  path,
  date,
  notify,
}: {
  path: string;
  date: string;
  notify: (m?: string) => void;
}) {
  const { state, save } = useStore();
  const router = useRouter();
  const current = state.sessions.find((s) => s.status === "in_progress");
  const [exerciseId, setExerciseId] = useState("");
  function start(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    if (
      save("開始訓練", (s) => {
        if (s.sessions.some((x) => x.status === "in_progress")) return;
        s.sessions.push({
          id: id(),
          date,
          name: String(d.get("name")),
          status: "in_progress",
          exercises: [],
          createdAt: now(),
        });
      })
    ) {
      notify();
      router.push("/training/session");
    }
  }
  function addExercise(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!current) return;
    const name = String(new FormData(e.currentTarget).get("exercise"));
    const eid = id();
    if (
      save("新增當次動作", (s) =>
        s.sessions
          .find((x) => x.id === current.id)!
          .exercises.push({ id: eid, name, sets: [] }),
      )
    ) {
      setExerciseId(eid);
      e.currentTarget.reset();
      notify();
    }
  }
  function addSet(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!current) return;
    const d = new FormData(e.currentTarget);
    const target = String(d.get("exerciseId"));
    const type = String(d.get("type")) as Segment["type"];
    const parentId = String(d.get("parent") || "");
    const segment = {
      id: id(),
      weight: Number(d.get("weight")),
      reps: Number(d.get("reps")),
      rir: d.get("rir") === "" ? null : Number(d.get("rir")),
      type,
      createdAt: now(),
      ...(["rp", "drop"].includes(type) ? { parentId } : {}),
    };
    if (
      save("保存訓練組", (s) => {
        const ex = s.sessions
          .find((x) => x.id === current.id)!
          .exercises.find((x) => x.id === target);
        if (!ex) throw Error("請先選擇動作");
        if (
          ["rp", "drop"].includes(type) &&
          !ex.sets.some((x) => x.id === parentId && x.type === "working")
        )
          throw Error("RP／Drop 必須選擇所屬工作組");
        ex.sets.push(segment);
      })
    ) {
      notify();
    }
  }
  return (
    <>
      <Heading
        eyebrow="TRAIN WITH INTENTION"
        title="Cardio"
        description="保留真實的重量、次數與感受，讓每次訓練都有跡可循。"
      />
      <Link href="/training" className="text-link">
        ← Training
      </Link>
      {path === "training/activity" ? (
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
                  name="calories"
                  label="器材／手動熱量 kcal（選填）"
                  required={false}
                />
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
                        {c.date} · {c.calories ?? "未填"} kcal（手動）
                      </p>
                    </div>
                  </div>
                ))
            ) : (
              <Empty title="尚無有氧紀錄" detail="記下時間，就從這裡開始。" />
            )}
          </Card>
        </div>
      ) : [
          "training/cycle",
          "training/templates",
          "training/exercises",
          "training/warmups",
        ].includes(path) ? (
        <Card
          title={
            path === "training/templates"
              ? "選擇你的訓練結構"
              : "Training Library"
          }
          icon={Dumbbell}
        >
          {path === "training/templates" && (
            <div
              className="stats-grid"
              style={{ gridTemplateColumns: "repeat(3,1fr)" }}
            >
              {["PPL", "Upper / Lower", "五分化"].map((t) => (
                <div className="stat" key={t}>
                  <h3>{t}</h3>
                  <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>
                    首批動作與處方待核定
                  </p>
                  <span className="tag" style={{ marginTop: 15 }}>
                    Draft
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="notice">
            這個入口已保留在完整架構。正式 Cycle、肌群目標與暖身 Preset
            將依核定模板啟用，目前可先使用 Workout Logger 記錄實際訓練。
          </div>
          <div className="form-actions">
            <Link className="button" href="/training/session">
              開啟 Workout Logger
              <ArrowRight size={14} />
            </Link>
          </div>
        </Card>
      ) : (
        <div className="dashboard-grid">
          <div className="stack">
            {!current ? (
              <Card title="開始今天的訓練" icon={Dumbbell}>
                <form onSubmit={start}>
                  <Field label="本次訓練名稱">
                    <input
                      name="name"
                      placeholder="例如：Upper A"
                      maxLength={80}
                      required
                    />
                  </Field>
                  <div className="form-actions">
                    <button className="button">
                      開始訓練
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </form>
              </Card>
            ) : (
              <>
                <Card
                  title={current.name}
                  kicker={`${current.date} · IN PROGRESS`}
                >
                  <form onSubmit={addExercise}>
                    <div className="toolbar">
                      <Field label="新增當次動作">
                        <input
                          name="exercise"
                          placeholder="例如：槓鈴臥推"
                          maxLength={80}
                          required
                        />
                      </Field>
                      <button className="button secondary small">
                        加入動作
                        <Plus size={13} />
                      </button>
                    </div>
                  </form>
                  {current.exercises.map((ex) => (
                    <div key={ex.id}>
                      <h3 style={{ margin: "18px 0 7px" }}>{ex.name}</h3>
                      {ex.sets.map((set, i) => (
                        <div className="session-set" key={set.id}>
                          <span>
                            {i + 1} · {set.type.toUpperCase()}
                          </span>
                          <span>
                            {set.weight} kg × {set.reps}{" "}
                            <span className="muted">
                              · RIR {set.rir ?? "—"}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                  {!current.exercises.length && (
                    <p className="muted">先加入一個動作，再記錄組數。</p>
                  )}
                </Card>
                <Card title="完成後，留一句感受">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const feedback = String(
                        new FormData(e.currentTarget).get("feedback"),
                      );
                      if (
                        save("完成訓練", (s) => {
                          const session = s.sessions.find(
                            (x) => x.id === current.id,
                          )!;
                          session.status = "completed";
                          session.completedAt = now();
                          session.feedback = feedback;
                        })
                      )
                        notify("訓練已完成並保存");
                    }}
                  >
                    <Field label="表現／疲勞／不適（選填）">
                      <textarea
                        name="feedback"
                        maxLength={600}
                        placeholder="今天感覺如何？"
                      />
                    </Field>
                    <div className="form-actions">
                      <button className="button">
                        完成訓練
                        <Check size={14} />
                      </button>
                    </div>
                  </form>
                </Card>
              </>
            )}
            <Card title="已完成的訓練" kicker="YOUR RECORD">
              {state.sessions.filter((s) => s.status === "completed").length ? (
                state.sessions
                  .filter((s) => s.status === "completed")
                  .slice()
                  .reverse()
                  .map((s) => (
                    <div className="list-row" key={s.id}>
                      <div className="grow">
                        <h3>{s.name}</h3>
                        <p>
                          {s.date} · {s.exercises.length} 個動作 ·{" "}
                          {
                            s.exercises
                              .flatMap((e) => e.sets)
                              .filter((x) => x.type === "working").length
                          }{" "}
                          工作組
                        </p>
                        {s.feedback && <p>{s.feedback}</p>}
                      </div>
                      <Check size={15} color="#82926b" />
                    </div>
                  ))
              ) : (
                <Empty
                  title="第一堂，從今天開始"
                  detail="完成訓練後會保留在這裡。"
                />
              )}
            </Card>
          </div>
          <div className="stack">
            {current && current.exercises.length > 0 && (
              <Card title="記錄一組" icon={Plus}>
                <form onSubmit={addSet}>
                  <div className="form-grid">
                    <div className="full">
                      <Field label="動作">
                        <select
                          name="exerciseId"
                          value={exerciseId || current.exercises[0].id}
                          onChange={(e) => setExerciseId(e.target.value)}
                        >
                          {current.exercises.map((ex) => (
                            <option key={ex.id} value={ex.id}>
                              {ex.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div className="full">
                      <Field label="組型">
                        <select name="type">
                          <option value="working">Working Set</option>
                          <option value="warmup">Warm-up</option>
                          <option value="rampup">Ramp-up</option>
                          <option value="rp">Rest-Pause 段落</option>
                          <option value="drop">Drop Set 段落</option>
                        </select>
                      </Field>
                    </div>
                    <NumberField name="weight" label="重量 kg" max={1000} />
                    <NumberField
                      name="reps"
                      label="次數"
                      min={1}
                      max={500}
                      step="1"
                    />
                    <NumberField
                      name="rir"
                      label="RIR（選填）"
                      max={10}
                      step="0.5"
                      required={false}
                    />
                    <Field label="RP／Drop 所屬工作組">
                      <select name="parent">
                        <option value="">一般組不需要</option>
                        {(
                          current.exercises.find(
                            (e) =>
                              e.id === (exerciseId || current.exercises[0].id),
                          )?.sets ?? []
                        )
                          .filter((s) => s.type === "working")
                          .map((s, i) => (
                            <option key={s.id} value={s.id}>
                              工作組 {i + 1} · {s.weight} kg × {s.reps}
                            </option>
                          ))}
                      </select>
                    </Field>
                  </div>
                  <div className="form-actions">
                    <button className="button">
                      保存這一組
                      <Check size={14} />
                    </button>
                  </div>
                </form>
              </Card>
            )}
            <RestTimer />
            <div className="notice">
              Working Set 與 RP／Drop 分段保存。Warm-up、Ramp-up
              不計工作組；肌群 Volume Credit 計法尚待核定。
            </div>
          </div>
        </div>
      )}
    </>
  );
}
function RestTimer() {
  const [end, setEnd] = useState<number | null>(null);
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!end) return;
    const update = () => {
      const l = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) setEnd(null);
    };
    update();
    const t = setInterval(update, 500);
    return () => clearInterval(t);
  }, [end]);
  return (
    <Card title="休息一下" kicker="REST TIMER">
      <p className="water-number" aria-live="off">
        {Math.floor(left / 60)
          .toString()
          .padStart(2, "0")}
        :{(left % 60).toString().padStart(2, "0")}
      </p>
      <div className="pill-row" style={{ marginTop: 18 }}>
        {[20, 60, 90, 120].map((s) => (
          <button
            key={s}
            onClick={() => {
              setLeft(s);
              setEnd(Date.now() + s * 1000);
            }}
          >
            {s}s
          </button>
        ))}
        <button
          onClick={() => {
            setEnd(null);
            setLeft(0);
          }}
        >
          重設
        </button>
      </div>
    </Card>
  );
}

function Progress({
  path,
  date,
  notify,
}: {
  path: string;
  date: string;
  notify: (m?: string) => void;
}) {
  const { state, save } = useStore();
  const [range, setRange] = useState("7");
  const measurements = visibleMeasurements(state);
  const start =
    range === "all" ? "0000-01-01" : addDays(date, -Number(range) + 1);
  const points = measurements.filter((m) => m.date >= start && m.date <= date);
  const days = state.days.filter((d) => d.date >= start && d.date <= date);
  const recovery = state.recoveries.filter(
    (r) => r.date >= start && r.date <= date,
  );
  const sessions = state.sessions.filter(
    (s) => s.date >= start && s.date <= date && s.status === "completed",
  );
  const sets = sessions.flatMap((s) => s.exercises.flatMap((e) => e.sets));
  const [measureDate, setMeasureDate] = useState(date);
  function measure(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const weight = Number(new FormData(e.currentTarget).get("weight"));
    if (
      save("新增／修正體重測量", (s) => {
        const old = visibleMeasurements(s).find((m) => m.date === measureDate);
        s.measurements.push({
          id: id(),
          date: measureDate,
          weight,
          createdAt: now(),
          ...(old ? { supersedes: old.id } : {}),
        });
      })
    ) {
      notify();
      e.currentTarget.reset();
    }
  }
  return (
    <>
      <Heading
        eyebrow=""
        title={
          path === "progress/history"
            ? "Plan Changes"
            : path === "progress/weekly"
              ? "Weekly Review"
              : "Progress"
        }
      />
      <ProgressLinks path={path} />
      {path === "progress/history" ? (
        <Card title="Nutrition Version History" icon={History}>
          {state.versions.length ? (
            state.versions
              .slice()
              .reverse()
              .map((v) => (
                <div className="version" key={v.id}>
                  <h3>
                    Nutrition v{v.number}
                    <span className="tag">
                      {v.effectiveDate > date
                        ? "隔日生效"
                        : activePlan(state, date)?.id === v.id
                          ? "目前使用"
                          : "歷史版本"}
                    </span>
                  </h3>
                  <p>{v.reason}</p>
                  <p>
                    生效 {v.effectiveDate} · {v.ruleId}
                  </p>
                  <TargetTable targets={v.targets} />
                </div>
              ))
          ) : (
            <Empty
              title="尚未建立版本"
              detail="確認初始計畫或採用調整後，會記錄在這裡。"
              href="/onboarding"
            />
          )}
          <div className="divider" />
          <h3>GAIN 決策</h3>
          {state.gainDecisions
            ?.slice()
            .reverse()
            .map((d) => (
              <div className="list-row" key={d.id}>
                <p>
                  {d.periodStart} — {d.periodEnd}
                  <br />
                  {d.status === "accepted" ? "Accepted" : "Keep Current"} ·{" "}
                  {d.reason}
                </p>
              </div>
            ))}
          <h3>Training Versions</h3>
          {state.cycles
            ?.slice()
            .reverse()
            .map((c, i) => (
              <div className="list-row" key={c.id}>
                <p>
                  {c.name} · {c.stage ?? "Intensity"}
                  <br />
                  {c.days.map((d) => d.name).join(" → ")}
                  <br />
                  {c.createdAt.slice(0, 10)}
                </p>
              </div>
            ))}
          <h3>操作歷史</h3>
          {state.audit
            .slice(-12)
            .reverse()
            .map((a) => (
              <div className="list-row" key={a.id}>
                <span className="grow">{a.action}</span>
                <small className="muted">
                  {new Date(a.at).toLocaleString("zh-TW")}
                </small>
              </div>
            ))}
        </Card>
      ) : path === "progress/recommendations" ? (
        <Recommendations date={date} notify={notify} />
      ) : (
        <>
          <div className="toolbar">
            <div className="pill-row">
              {[
                ["7", "7 Days"],
                ["30", "30 Days"],
                ["all", "All Time"],
              ].map(([v, l]) => (
                <button
                  key={v}
                  style={
                    range === v ? { background: "#263020", color: "#fff" } : {}
                  }
                  onClick={() => setRange(v)}
                >
                  {l}
                </button>
              ))}
            </div>
            <span className="muted" style={{ fontSize: 11 }}>
              截止 {date} · 日曆日統計
            </span>
          </div>
          <div className="stats-grid">
            <div className="stat">
              <small>最近實測體重</small>
              <strong>
                {points.at(-1)?.weight ?? "—"}
                <small> kg</small>
              </strong>
              <small>{points.length} 筆實測</small>
            </div>
            <div className="stat">
              <small>飲食記錄完整</small>
              <strong>
                {days.filter((d) => d.complete).length}
                <small> 天</small>
              </strong>
              <small>未記錄不視為零攝取</small>
            </div>
            <div className="stat">
              <small>完成訓練</small>
              <strong>
                {sessions.length}
                <small> 次</small>
              </strong>
              <small>
                {sets.filter((s) => s.type === "working").length} 主要工作組
              </small>
            </div>
            <div className="stat">
              <small>恢復紀錄</small>
              <strong>
                {new Set(recovery.map((r) => r.date)).size}
                <small> 天</small>
              </strong>
              <small>睡眠・疲勞・壓力</small>
            </div>
          </div>
          {(path === "progress" || path === "progress/body") && (
            <div className="dashboard-grid">
              <Card title="體重的變化" kicker="BODY TREND" icon={TrendingUp}>
                {points.length >= 2 ? (
                  <>
                    <WeightChart points={points} />
                    <div className="chart-labels">
                      <span>{points[0].date}</span>
                      <span>{points.at(-1)!.date}</span>
                    </div>
                  </>
                ) : (
                  <Empty
                    title="讓趨勢慢慢出現"
                    detail="目前範圍至少需要兩筆不同日期的實測體重。"
                  />
                )}
                {points.map((m) => (
                  <div className="list-row" key={m.id}>
                    <span className="grow">{m.date}</span>
                    <strong>{m.weight} kg</strong>
                  </div>
                ))}
              </Card>
              <Card title="記下今天的起點" icon={Plus}>
                <form onSubmit={measure}>
                  <div className="stack">
                    <Field label="測量日期">
                      <DateField
                        value={measureDate}
                        onChange={setMeasureDate}
                      />
                    </Field>
                    <NumberField
                      name="weight"
                      label="體重 kg"
                      min={30}
                      max={350}
                    />
                  </div>
                  <div className="form-actions">
                    <button className="button">
                      保存測量
                      <Check size={14} />
                    </button>
                  </div>
                </form>
                <p className="muted" style={{ fontSize: 11, marginTop: 18 }}>
                  同一天重新輸入視為修正，原始紀錄仍保留。不自動沿用昨日體重。
                </p>
              </Card>
            </div>
          )}
          {path === "progress/nutrition" && (
            <Card title="Nutrition History" icon={Utensils}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>日期</th>
                      <th>P</th>
                      <th>C</th>
                      <th>F</th>
                      <th>kcal</th>
                      <th>紀錄完整</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ...new Set([
                        ...days.map((d) => d.date),
                        ...visibleMeals(state)
                          .filter((m) => m.date >= start && m.date <= date)
                          .map((m) => m.date),
                      ]),
                    ]
                      .sort()
                      .reverse()
                      .map((d) => {
                        const t = mealTotals(state, d);
                        return (
                          <tr key={d}>
                            <td>{d}</td>
                            <td>{t.p}</td>
                            <td>{t.c}</td>
                            <td>{t.f}</td>
                            <td>{t.kcal}</td>
                            <td>
                              {days.find((x) => x.date === d)?.complete
                                ? "完整"
                                : "未確認"}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              {!days.length && (
                <Empty
                  title="尚無飲食紀錄"
                  detail="開始記錄後即可查看每天營養素。"
                  href="/nutrition"
                  action="記錄一餐"
                />
              )}
            </Card>
          )}
          {path === "progress/training" && (
            <Card title="Training Performance" icon={Dumbbell}>
              <div className="notice">
                以下為所選日曆期間的實際紀錄，尚未套用 Cycle Muscle Volume
                Credit。
              </div>
              <div
                className="stats-grid"
                style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 20 }}
              >
                <div className="stat">
                  <small>Actual Working Sets</small>
                  <strong>
                    {sets.filter((s) => s.type === "working").length}
                  </strong>
                </div>
                <div className="stat">
                  <small>Volume Load（工作＋RP／Drop）</small>
                  <strong style={{ fontSize: 20 }}>
                    {round(
                      sets
                        .filter((s) => !["warmup", "rampup"].includes(s.type))
                        .reduce((a, s) => a + s.weight * s.reps, 0),
                    )}
                  </strong>
                  <small>kg × reps · 不同動作僅作原始總和</small>
                </div>
                <div className="stat">
                  <small>Muscle Volume Credit</small>
                  <strong>—</strong>
                  <small>計法待核定</small>
                </div>
              </div>
              {sessions.map((s) => (
                <div className="list-row" key={s.id}>
                  <div className="grow">
                    <h3>{s.name}</h3>
                    <p>{s.date}</p>
                  </div>
                  <span>{s.exercises.length} 個動作</span>
                </div>
              ))}
            </Card>
          )}
          {path === "progress/recovery" && (
            <div className="dashboard-grid">
              <Card title="記錄恢復" icon={Sun}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const d = new FormData(e.currentTarget);
                    if (
                      save("新增恢復紀錄", (s) =>
                        s.recoveries.push({
                          id: id(),
                          date: String(d.get("date")),
                          sleep: Number(d.get("sleep")),
                          fatigue: Number(d.get("fatigue")),
                          soreness: Number(d.get("soreness")),
                          stress: Number(d.get("stress")),
                          note: String(d.get("note") || ""),
                          createdAt: now(),
                        }),
                      )
                    )
                      notify();
                  }}
                >
                  <div className="form-grid">
                    <Field label="日期">
                      <input
                        type="date"
                        name="date"
                        defaultValue={date}
                        max={date}
                        required
                      />
                    </Field>
                    <NumberField
                      label="昨晚睡眠 小時"
                      name="sleep"
                      max={24}
                      step="0.5"
                    />
                    {[
                      ["fatigue", "疲勞"],
                      ["soreness", "痠痛"],
                      ["stress", "壓力"],
                    ].map(([n, l]) => (
                      <Field key={n} label={`${l}（1 低 → 5 高）`}>
                        <select name={n}>
                          {[1, 2, 3, 4, 5].map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      </Field>
                    ))}
                    <div className="full">
                      <Field label="補充感受（選填）">
                        <textarea name="note" maxLength={600} />
                      </Field>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button className="button">保存今日狀態</button>
                  </div>
                </form>
              </Card>
              <Card title="恢復紀錄">
                {recovery.length ? (
                  recovery
                    .slice()
                    .reverse()
                    .map((r) => (
                      <div key={r.id} className="list-row">
                        <div className="grow">
                          <h3>
                            {r.date} · 睡眠 {r.sleep}h
                          </h3>
                          <p>
                            疲勞 {r.fatigue} / 痠痛 {r.soreness} / 壓力{" "}
                            {r.stress}
                          </p>
                          {r.note && <p>{r.note}</p>}
                        </div>
                      </div>
                    ))
                ) : (
                  <Empty title="尚未紀錄" detail="沒有紀錄不等於已完全恢復。" />
                )}
              </Card>
            </div>
          )}
          {path === "progress/weekly" && (
            <div className="stack">
              <Card title="這七天的回顧" icon={ClipboardList}>
                <p className="muted">
                  Weekly Review 與 CUT
                  調整使用不同時間尺度。上方可檢查紀錄完整度；CUT 按原試算表每
                  10 天檢查一次。
                </p>
                <div className="divider" />
                <p>
                  本週資料：
                  {
                    state.days.filter(
                      (d) =>
                        d.date >= addDays(date, -6) &&
                        d.date <= date &&
                        d.complete,
                    ).length
                  }{" "}
                  天完整飲食紀錄、
                  {
                    measurements.filter(
                      (m) => m.date >= addDays(date, -6) && m.date <= date,
                    ).length
                  }{" "}
                  次實測體重。
                </p>
                <div className="form-actions">
                  <Link className="button secondary" href="/progress/review">
                    查看 CUT 規則結果
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </Card>
              <div className="notice">
                資料不足時保留現行計畫。GAIN、訓練 Progression 與 Pain Safety
                的正式規則仍待核定。
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
function WeightChart({
  points,
}: {
  points: { date: string; weight: number }[];
}) {
  const min = Math.min(...points.map((p) => p.weight)) - 1,
    max = Math.max(...points.map((p) => p.weight)) + 1;
  const duration = Math.max(
    1,
    daysBetween(points[0].date, points.at(-1)!.date),
  );
  const xy = points.map((p) => ({
    x: 20 + (daysBetween(points[0].date, p.date) / duration) * 480,
    y: 140 - ((p.weight - min) / (max - min)) * 115,
  }));
  return (
    <svg
      className="chart"
      viewBox="0 0 520 165"
      role="img"
      aria-label={`體重由 ${points[0].weight} 變為 ${points.at(-1)!.weight} 公斤`}
    >
      <line x1="20" y1="140" x2="500" y2="140" stroke="#e3e7da" />
      <line
        x1="20"
        y1="80"
        x2="500"
        y2="80"
        stroke="#e3e7da"
        strokeDasharray="3 6"
      />
      <polyline
        fill="none"
        stroke="#91a078"
        strokeWidth="2.5"
        points={xy.map((p) => `${p.x},${p.y}`).join(" ")}
      />
      {xy.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#a79560" />
          <text
            x={p.x}
            y={p.y - 12}
            textAnchor="middle"
            fontSize="11"
            fill="#858c79"
          >
            {points[i].weight}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Recommendations({
  date,
  notify,
}: {
  date: string;
  notify: (m?: string) => void;
}) {
  const { state, save } = useStore();
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<{
    rec: Recommendation;
    delta: number;
  } | null>(null);
  const [activityAcknowledged,setActivityAcknowledged] = useState(false);
  const plan = activePlan(state, date);
  const baseDate = plan?.effectiveDate ?? date;
  const periods = Math.max(0, Math.floor(daysBetween(baseDate, date) / 10));
  const [period, setPeriod] = useState(Math.max(1, periods));
  const start = addDays(baseDate, (period - 1) * 10),
    end = addDays(baseDate, period * 10);
  function evaluate() {
    setMessage("");
    if (!plan || !state.profile?.eligible || state.profile.goal !== "CUT") {
      setMessage("請先建立符合入口條件的 CUT 計畫。");
      return;
    }
    if (end > date) {
      setMessage(`尚未到 ${end}，保留目前計畫。`);
      return;
    }
    const ms = visibleMeasurements(state);
    const a = ms.find((m) => m.date === start),
      b = ms.find((m) => m.date === end);
    if (!a || !b) {
      setMessage(
        `需要 ${start} 與 ${end} 的實測體重。請到 Body 補登，系統不使用沿用值代替。`,
      );
      return;
    }
    const result = cutReview(
      plan.inputs,
      start === state.versions[0].effectiveDate,
      a.weight,
      b.weight,
    );
    if (!result.direction) {
      setMessage(`依原表判斷，本期減重 ${result.loss} kg，無需調整。`);
      return;
    }
    const duplicate = state.recommendations.find(
      (r) =>
        r.baseVersionId === plan.id &&
        r.periodStart === start &&
        r.periodEnd === end &&
        r.startWeight === a.weight &&
        r.endWeight === b.weight,
    );
    if (duplicate) {
      setMessage(
        `這個期間已評估，狀態：${{ pending: "待決定", kept: "已保留原設定", accepted: "已採用", expired: "已失效" }[duplicate.status]}。`,
      );
      return;
    }
    if (
      save("建立 CUT 原表規則建議", (s) => {
        s.recommendations
          .filter((r) => r.status === "pending")
          .forEach((r) => {
            r.status = "expired";
          });
        s.recommendations.push({
          id: id(),
          baseVersionId: plan.id,
          createdAt: now(),
          periodStart: start,
          periodEnd: end,
          startWeight: a.weight,
          endWeight: b.weight,
          loss: result.loss,
          direction: result.direction!,
          range: result.range!,
          ruleId: RULE_ID,
          status: "pending",
        });
      })
    ) {
      notify("已產生一項主要建議");
    }
  }
  return (
    <div className="stack">
      <Card title="CUT · 10 天評估" icon={SlidersHorizontal}>
        <div className="notice">
          依 Numbers 實際公式 C32／C33 判斷。第一版只調碳水；未加入原表沒有的
          BMI 換算或額外安全下限。所有結果需由你檢視後決定。
        </div>
        <div className="toolbar" style={{ marginTop: 20 }}>
          <Field label="評估期間">
            <select
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
            >
              {Array.from({ length: Math.max(1, periods) }, (_, i) => (
                <option key={i} value={i + 1}>
                  {addDays(baseDate, i * 10)} →{" "}
                  {addDays(baseDate, (i + 1) * 10)}
                </option>
              ))}
            </select>
          </Field>
          <button className="button" onClick={evaluate} disabled={!plan}>
            檢查原表規則
            <ArrowRight size={14} />
          </button>
        </div>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
      </Card>
      {state.recommendations
        .slice()
        .reverse()
        .map((rec) => (
          <Card
            key={rec.id}
            title={
              rec.direction === "increase"
                ? "提高碳水攝取的建議"
                : "降低碳水攝取的建議"
            }
            kicker={`${rec.periodStart} — ${rec.periodEnd}`}
          >
            <span className="tag">
              {
                {
                  pending: "待你決定",
                  accepted: "已採用",
                  kept: "保留原設定",
                  expired: "已失效",
                }[rec.status]
              }
            </span>
            <p style={{ marginTop: 15 }}>
              實測 {rec.startWeight} → {rec.endWeight} kg，本期減重 {rec.loss}{" "}
              kg。
            </p>
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              原表規則建議{rec.direction === "increase" ? "增加" : "減少"}碳水{" "}
              {rec.range[0]}–{rec.range[1]} g。蛋白質與脂肪保持不變。
            </p>
            <p className="muted" style={{ fontSize: 10, marginTop: 8 }}>
              Rule: {rec.ruleId} · 基於當時的計畫與測量快照
            </p>
            {rec.status === "pending" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setActivityAcknowledged(false);
                  setPreview({
                    rec,
                    delta: Number(new FormData(e.currentTarget).get("delta")),
                  });
                }}
              >
                <div className="form-actions">
                  <NumberField
                    label="選擇調整克數"
                    name="delta"
                    min={rec.range[0]}
                    max={rec.range[1]}
                    value={rec.range[0]}
                    step="1"
                  />
                  <button className="button" type="submit">
                    預覽調整
                  </button>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => {
                      if (
                        save("Keep 建議", (s) =>
                          decide(s, rec.id, "kept", 0, date, id(), now()),
                        )
                      )
                        notify("已保留原設定");
                    }}
                  >
                    Keep · 保留
                  </button>
                </div>
              </form>
            )}
          </Card>
        ))}
      {preview && (
        <Card title="確認後，隔日生效" icon={History}>
          {activityEvidenceForReview(state, preview.rec.periodEnd).significant && (
            <div className="activity-review-hold">
              <strong>活動量有明顯變化，建議先觀察</strong>
              <p>前七天平均 {activityEvidenceForReview(state,preview.rec.periodEnd).previousAverage?.toLocaleString("en-US")} 步；
                最近七天 {activityEvidenceForReview(state,preview.rec.periodEnd).recentAverage?.toLocaleString("en-US")} 步。
                步數變化不能直接換算為熱量。</p>
              <label className="check">
                <input type="checkbox" checked={activityAcknowledged} onChange={e=>setActivityAcknowledged(e.target.checked)}/>
                我已確認活動變化，仍希望依原始 CUT 規則調整
              </label>
            </div>
          )}
          <p>
            各日型碳水均{preview.rec.direction === "increase" ? "增加" : "減少"}{" "}
            {preview.delta} g，P／F
            不變。這次改變是每日克數，不再乘一次日型倍率。
          </p>
          {plan && (
            <div className="table-wrap" style={{ marginTop: 15 }}>
              <table>
                <thead>
                  <tr>
                    <th>日型</th>
                    <th>目前 C</th>
                    <th>採用後 C</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(dayNames) as DayType[]).map((d) => (
                    <tr key={d}>
                      <td>{dayNames[d]}</td>
                      <td>{plan.targets[d].c} g</td>
                      <td>
                        {round(
                          plan.targets[d].c +
                            (preview.rec.direction === "increase"
                              ? preview.delta
                              : -preview.delta),
                        )}{" "}
                        g
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="form-actions">
            <button
              className="button"
              disabled={activityEvidenceForReview(state, preview.rec.periodEnd).significant && !activityAcknowledged}
              onClick={() => {
                if (
                  save("Accept 建議並建立新版本", (s) =>
                    decide(
                      s,
                      preview.rec.id,
                      "accepted",
                      preview.delta,
                      date,
                      id(),
                      now(),
                      activityAcknowledged,
                    ),
                  )
                ) {
                  setPreview(null);
                  notify("已建立新版本，隔日生效");
                }
              }}
            >
              Accept · 確認採用
            </button>
            <button
              className="button secondary"
              onClick={() => setPreview(null)}
            >
              返回
            </button>
          </div>
        </Card>
      )}
      {!state.recommendations.length && (
        <Card>
          <Empty
            title="尚無建議"
            detail="到評估日後，使用真實紀錄檢查是否需要調整。"
            href="/progress/body"
            action="記錄體重"
          />
        </Card>
      )}
    </div>
  );
}
function SettingsPage({
  path,
  notify,
}: {
  path: string;
  notify: (m?: string) => void;
}) {
  const { state, save, reset } = useStore();
  const [slot, setSlot] = useState("");
  const router = useRouter();
  function download(raw = false) {
    const content = raw
      ? (localStorage.getItem(STORAGE_KEY) ?? "{}")
      : JSON.stringify(state, null, 2);
    const url = URL.createObjectURL(
      new Blob([content], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `james-fitness-backup-${dateInZone()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("備份已匯出");
  }
  return (
    <>
      <Heading
        eyebrow="MAKE IT YOURS"
        title={
          path === "settings/privacy"
            ? "隱私說明"
            : path === "settings/data"
              ? "資料管理"
              : "Settings"
        }
        description="設定、資料與使用方式，集中在這裡。"
      />
      <div className="subnav">
        <Link href="/settings">系統設定</Link>
        <Link href="/data">資料管理</Link>
        <Link href="/settings/privacy">隱私說明</Link>
      </div>
      <div className="narrow stack">
        {path === "settings/appearance" ? (
          <AppearanceSettings notify={notify} />
        ) : path === "settings/privacy" ? (
          <Card title="本機版隱私說明" icon={ShieldCheck}>
            <div className="stack">
              <p>
                本版本不建立雲端帳號、不收集密碼，也不把健身紀錄傳送至伺服器。資料保存在目前網域、目前瀏覽器的本機儲存。
              </p>
              <p>
                同一瀏覽器的使用者可能讀取這些資料。請避免在共用裝置輸入私人資訊。換裝置、換網址或清除網站資料後，不會自動帶入原紀錄。
              </p>
              <p>
                網站託管平台仍可能處理一般連線紀錄，例如 IP
                與請求網址；這不等於健身紀錄已上傳。
              </p>
              <p>
                原始紀錄與修訂保存在本機，直到你主動刪除。匯出的備份檔也包含這些資訊，請自行妥善保管。
              </p>
              <p>
                Supabase 的登入、RLS
                與跨裝置同步尚未啟用；本機模式不宣稱具備雲端使用者隔離。
              </p>
            </div>
          </Card>
        ) : path === "settings/data" ? (
          <>
            <DataTools notify={notify} />
            <Card title="匯出與備份" icon={Download}>
              <p className="muted">
                包含個人設定、飲食、飲水、體重、訓練、計畫版本與操作歷史。換裝置前先保留一份。
              </p>
              <div className="form-actions">
                <button className="button" onClick={() => download()}>
                  匯出 JSON 備份
                  <Download size={14} />
                </button>
                <button
                  className="button secondary"
                  onClick={() => download(true)}
                >
                  匯出原始儲存資料
                </button>
              </div>
            </Card>
            <Card title="清除這個瀏覽器的資料" icon={Trash2}>
              <p className="muted">
                此操作無法在 App
                內復原。請先下載備份。雲端尚未啟用，因此不涉及刪除雲端帳號。
              </p>
              <div className="form-actions">
                <button
                  className="button danger"
                  onClick={() => {
                    if (
                      window.confirm(
                        "已匯出備份嗎？確定刪除這個瀏覽器內所有 James Fitness 紀錄？",
                      ) &&
                      window.confirm("第二次確認：所有本機 Profile、Nutrition、Training、Progress 與 History 都會刪除。確定繼續？")
                    ) {
                      reset();
                      router.push("/today");
                      notify("已清除本機資料");
                    }
                  }}
                >
                  刪除本機資料
                </button>
              </div>
            </Card>
          </>
        ) : (
          <>
            <Card title="我的餐次" icon={Utensils}>
              <div className="pill-row">
                {state.mealSlots.map((s) => (
                  <span className="tag" key={s}>
                    {s}
                  </span>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = slot.trim();
                  if (!name) return;
                  if (
                    save("新增餐次", (s) => {
                      if (s.mealSlots.includes(name)) throw Error("餐次已存在");
                      s.mealSlots.push(name);
                    })
                  ) {
                    setSlot("");
                    notify();
                  }
                }}
              >
                <div className="form-actions">
                  <Field label="新增餐次">
                    <input
                      value={slot}
                      maxLength={20}
                      onChange={(e) => setSlot(e.target.value)}
                      placeholder="例如：午加餐"
                      required
                    />
                  </Field>
                  <button className="button secondary">
                    新增
                    <Plus size={13} />
                  </button>
                </div>
              </form>
            </Card>
            <Card title="飲水目標" icon={Droplet}>
              {state.profile ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const target = Number(
                      new FormData(e.currentTarget).get("target"),
                    );
                    if (
                      save("更新飲水目標", (s) => {
                        s.profile!.waterTarget = target;
                      })
                    )
                      notify();
                  }}
                >
                  <NumberField
                    label="每日 ml（0 代表未設定）"
                    name="target"
                    value={state.profile.waterTarget}
                    step="50"
                  />
                  <div className="form-actions">
                    <button className="button secondary">保存目標</button>
                  </div>
                </form>
              ) : (
                <Link className="text-link" href="/onboarding">
                  先建立個人資料 →
                </Link>
              )}
            </Card>
            <Card title="目前環境" icon={Info}>
              <p>本機資料版 · v0.4.0</p>
              <p className="muted" style={{ marginTop: 10 }}>
                時區 Asia/Taipei · kg / g / ml
                <br />
                GitHub Pages 可提供網站，但目前不提供雲端資料同步。
              </p>
              <div className="form-actions">
                <Link className="button secondary" href="/data">
                  資料管理
                  <ArrowRight size={14} />
                </Link>
              </div>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
