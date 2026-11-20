"use client";
import { OnboardingWizard } from "./onboarding-wizard";
import {
  WorkoutHistoryDetail,
  ExerciseGuideDetail,
  ExerciseProgressDetail,
} from "./detail-pages";
import { SettingsHub } from "./settings-hub";
import { MealSettings } from "./meal-settings";
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
import { TodayMinimalV3 } from "./today-minimal-v3";
import { AppSidebar, AppBottomNavigation } from "./ui/app-navigation";
import {
  GoogleLogin,
  GoogleCallback,
  LegacyDataOffer,
  GuestDataOffer,
} from "./auth-pages";
import { useAuth } from "@/lib/auth-context";
import { TrainingFlow } from "./training-flow";
import { Knowledge } from "./knowledge";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Menu as MenuIcon, User } from "lucide-react";
import { useStore } from "@/lib/store";
import { dateInZone } from "@/lib/domain";

import { Heading } from "@/components/ui/page-content";
import { Onboarding } from "@/features/profile/profile-editor";
import { Nutrition } from "@/features/nutrition/plan";
import { Cardio } from "@/features/training/cardio";
import { Progress, Recommendations } from "@/features/progress/progress";
import { SettingsPage } from "@/features/settings/data-settings";
const labelMap: Record<string, string> = {
  today: "Today",
  nutrition: "Journal",
  training: "Training",
  progress: "Insights",
  learn: "Knowledge",
  profile: "Profile",
  settings: "Settings",
  onboarding: "Get started",
  login: "Welcome",
  signup: "Welcome",
};
export function FitnessApp({ path }: { path: string }) {
  const router = useRouter();
  const { state, ready, error, saving } = useStore();
  const { user, ready: authReady, signOut, isGuest } = useAuth();
  const section = path.split("/")[0];
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  // Routine success notices are silent across Today, Water, Nutrition,
  // Training, Progress and Settings. Store writes and visible totals remain
  // unchanged. Explicit validation, failure and confirmation messages remain.
  const notify = (message?: string) => {
    if (
      !message ||
      /已(?:儲存|保存|更新|更名|新增|加入|建立|記錄|完成|刪除|移除|撤回|撤銷|套用|產生|保留|移到|安排|放棄|修改)|(?:儲存|保存)成功/.test(
        message,
      )
    )
      return;
    setToast(message);
  };
  const date = dateInZone(state.profile?.timezone);
  if (path === "auth/callback") return <GoogleCallback />;
  if (!authReady)
    return (
      <main className="jfs-auth-screen" role="status">
        正在確認帳號…
      </main>
    );
  if (
    !user ||
    section === "login" ||
    section === "signup" ||
    path === "auth/error"
  )
    return <GoogleLogin />;
  return (
    <div
      className={
        path === "training/session"
          ? `app page-${section} workout-active`
          : `app page-${section} ${["today", "nutrition", "training", "progress"].includes(section) ? "jfs3-shell" : ""}`
      }
    >
      <AppSidebar section={section} />
      <main className="main">
        <header className="topbar">
          <div className="breadcrumb" aria-label="目前所在頁面">
            {section === "today" ? (
              <div className="today-header-brand">
                <span className="wordmark">JAMES</span>
                <span className="today-header-subtitle">FITNESS SYSTEM</span>
              </div>
            ) : (
              <>
                <span className="wordmark">JAMES FITNESS</span>
                <span className="breadcrumb-separator" aria-hidden="true">
                  /
                </span>
                <span className="current-section">
                  {labelMap[section] ?? "James"}
                </span>
              </>
            )}
          </div>
          <div className={section === "today" ? "today-header-actions" : ""}>
            {section === "today" && (
              <a
                className="today-header-bell"
                href="#today-action-queue"
                aria-label="查看今日提醒"
              >
                <Bell size={18} />
              </a>
            )}
            <details className="account-menu">
              <summary aria-label="帳戶選單">
                {section === "today" ? (
                  <MenuIcon size={20} />
                ) : (
                  <User size={20} />
                )}
              </summary>
              <div>
                <Link href="/profile">Profile · 個人資料</Link>
                <Link href="/knowledge">Knowledge · 知識庫</Link>
                <Link href="/data">Data & Backup · 資料管理</Link>
                <Link href="/settings">Settings · 系統設定</Link>
                {isGuest && (
                  <Link href="/login">登入 Google 帳號（訪客資料保留）</Link>
                )}
                <button
                  className="jfs-account-logout"
                  type="button"
                  onClick={() => void signOut()}
                >
                  {isGuest ? "退出訪客模式" : "Sign out · 登出"}
                </button>
              </div>
            </details>
          </div>
        </header>
        <LegacyDataOffer />
        <GuestDataOffer />
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
            {[
              "training",
              "training/plan",
              "training/history",
              "training/calendar",
            ].includes(path) && (
              <nav className="training-workspaces" aria-label="訓練工作區">
                <select
                  aria-label="切換訓練工作區"
                  value={path === "training/calendar" ? "training/plan" : path}
                  onChange={(event) => router.push("/" + event.target.value)}
                >
                  <option value="training">Training Home</option>
                  <option value="training/plan">Training Plan</option>
                  <option value="training/history">Workout History</option>
                </select>
                {[
                  ["training", "Training Home"],
                  ["training/plan", "Training Plan"],
                  ["training/history", "Workout History"],
                ].map(([href, label]) => (
                  <Link
                    key={href}
                    href={"/" + href}
                    aria-current={path === href ? "page" : undefined}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            )}
            {path.includes("/") && path !== "training/session" && (
              <Link className="text-link" href={"/" + section}>
                ← {section === "settings" ? "Settings" : section}
              </Link>
            )}
            {section === "onboarding" ? (
              <OnboardingWizard path={path} notify={notify} />
            ) : section === "profile" ? (
              <Onboarding editing notify={notify} />
            ) : section === "today" ? (
              <TodayMinimalV3 date={date} notify={notify} />
            ) : section === "nutrition" ? (
              path === "nutrition/meals" ? (
                <MealSettings notify={notify} />
              ) : path === "nutrition/plan" &&
                state.profile?.goal === "GAIN" ? (
                <GainReview date={date} notify={notify} />
              ) : path === "nutrition/recipes" ||
                path === "nutrition/recipes/detail" ? (
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
                <Cardio date={date} notify={notify} />
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
                <Heading
                  eyebrow="ACCOUNT"
                  title={
                    path === "auth/error"
                      ? "登入發生問題"
                      : "Google 登入尚未接通"
                  }
                />
                <p className="muted">
                  目前這個 GitHub Pages 版本沒有連接 Google OAuth 與雲端
                  Session。請不要在這裡輸入帳號密碼。
                </p>
                <Link className="button secondary" href="/settings/account">
                  查看帳號系統狀態
                </Link>
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
      <AppBottomNavigation section={section} />
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
