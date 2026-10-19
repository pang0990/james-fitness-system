"use client";

import { useState } from "react";
import { ArrowRight, ChevronRight, Dumbbell, Plus, Utensils, Activity } from "lucide-react";
import {
  UiActionLink, UiButton, UiEmptyState, UiProgressTrack,
  UiSectionHeading, UiSurface,
} from "./design-system";

/**
 * Developer-only design inspection surface.
 * Synthetic values; never imports the user store and never reads private data.
 * This route is omitted from the Pages export by prepare-pages.mjs.
 */
export function UiShowcase() {
  const [active, setActive] = useState<"today" | "nutrition" | "training" | "progress">("today");
  const [log, setLog] = useState(0);
  const [note, setNote] = useState("");
  return (
    <main className="jfs-showcase" data-testid="ui-showcase">
      <header className="jfs-showcase-heading">
        <div><span className="jfs-showcase-overline">INTERNAL UI LAB · DESIGN SYSTEM 3.0</span>
          <h1>James Fitness · Components</h1>
          <p>黑白灰視覺、立體材質、互動狀態與響應式元件。以下全部為示範資料。</p>
        </div>
        <span className="jfs-showcase-version">V3.0 / REVIEW</span>
      </header>
      <div className="jfs-showcase-group">
        <UiSectionHeading title="Surface & Elevation" icon={Dumbbell} />
        <div className="jfs-showcase-surface-grid">
          {(["flat", "card", "raised"] as const).map((level, index) => (
            <UiSurface key={level} level={level} className="jfs-showcase-surface">
              <span className="jfs-showcase-overline">E{index}</span>
              <strong>{level.toUpperCase()}</strong>
              <small>{["Inset / no depth", "Content surface", "Floating surface"][index]}</small>
            </UiSurface>
          ))}
        </div>
      </div>
      <div className="jfs-showcase-group">
        <UiSectionHeading title="Actions & States" icon={Plus}/>
        <div className="jfs-showcase-actions">
          <UiButton tone="primary" onClick={() => { setLog(n => n + 1); setNote("動作已完成"); }}>
            完成一組 <ArrowRight size={16}/>
          </UiButton>
          <UiButton tone="secondary" onClick={() => setNote("已選擇次要操作")}>次要按鈕</UiButton>
          <UiButton tone="quiet" onClick={() => setNote("操作已選擇")}>輕量操作</UiButton>
          <UiButton tone="primary" disabled>停用狀態</UiButton>
          <UiButton tone="secondary" loading>處理中…</UiButton>
          <UiActionLink href="/today" tone="secondary">Today <ChevronRight size={15}/></UiActionLink>
        </div>
        <p className="jfs-showcase-feedback" role="status">{note || "操作按鈕可測試按壓、焦點及完成回饋。"}</p>
      </div>
      <div className="jfs-showcase-group">
        <UiSectionHeading title="Data & Progress" icon={Activity}/>
        <div className="jfs-showcase-surface-grid">
          <UiSurface className="jfs-showcase-data">
            <strong>訓練組數</strong>
            <p><b>{log}</b> / 6 組</p>
            <UiProgressTrack value={log} target={6} label="示範組數進度"/>
          </UiSurface>
          <UiSurface className="jfs-showcase-data">
            <strong>營養進度</strong>
            <p><b>87</b> / 140 g</p>
            <UiProgressTrack value={87} target={140} label="示範蛋白質進度"/>
          </UiSurface>
          <UiSurface className="jfs-showcase-data">
            <strong>尚未設定</strong>
            <p><b>0</b> / — ml</p>
            <UiProgressTrack value={0} target={null} label="示範無目標飲水"/>
          </UiSurface>
        </div>
      </div>
      <div className="jfs-showcase-group">
        <UiSectionHeading title="Navigation & Selection" icon={Utensils}/>
        <nav className="jfs-showcase-tabs" aria-label="設計展示的頁面選擇">
          {(["today", "nutrition", "training", "progress"] as const).map(key =>
            <button type="button" key={key} className={active===key ? "active" : ""}
              aria-pressed={active===key} onClick={() => setActive(key)}>
              {key.charAt(0).toUpperCase()+key.slice(1)}
            </button>
          )}
        </nav>
        <p className="jfs-showcase-feedback">選中項目：{active}</p>
      </div>
      <div className="jfs-showcase-group">
        <UiSectionHeading title="Empty & Guidance" icon={Activity}/>
        <UiSurface className="jfs-showcase-empty">
          <UiEmptyState title="目前沒有訓練紀錄" description="完成第一場訓練後，才能建立你的進步趨勢。"
            action={<UiActionLink href="/training">前往訓練 <ArrowRight size={15}/></UiActionLink>} />
        </UiSurface>
      </div>
    </main>
  );
}
