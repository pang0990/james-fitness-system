"use client";

import { useState, type CSSProperties } from "react";
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
  const [material, setMaterial] = useState<"crystal" | "clear" | "solid">("crystal");
  // Showcase-only control; this does not mutate account preferences or the live site.
  const [transparency, setTransparency] = useState(25);
  const whiteAlpha = 1 - transparency / 100;
  const crystalStyle = material === "crystal" ? ({
    "--jfs4-glass-surface": `rgba(255,255,255,${whiteAlpha.toFixed(2)})`,
    "--jfs4-glass-raised": `rgba(255,255,255,${Math.min(.96, whiteAlpha + .07).toFixed(2)})`,
    "--jfs4-glass-control": `rgba(255,255,255,${Math.min(.94, whiteAlpha + .05).toFixed(2)})`,
  } as CSSProperties) : undefined;
  return (
    <main className="jfs-showcase" data-testid="ui-showcase" data-material={material} style={crystalStyle}>
      <header className="jfs-showcase-heading">
        <div><span className="jfs-showcase-overline">JFS CRYSTAL GLASS LAB · DESIGN SYSTEM 5.0</span>
          <h1>James Fitness · White Crystal Glass</h1>
          <p>參考 iPhone 控制中心的玻璃層次：光線、霧化、透明度和實際操作。以下全部為示範資料。</p>
        </div>
        <span className="jfs-showcase-version">CRYSTAL V5 / REVIEW</span>
      </header>
      <div className="jfs-showcase-material-switch" role="group" aria-label="玻璃材質比較">
        {([
          ["crystal", "黑底白玻璃"],
          ["clear", "高透白玻璃"],
          ["solid", "原本霧面"],
        ] as const).map(([key, label]) => (
          <button key={key} type="button" aria-pressed={material === key}
            onClick={() => setMaterial(key)}>
            {label}
          </button>
        ))}
      </div>
      {material === "crystal" && (
        <div className="jfs-showcase-transparency" aria-label="調整白色玻璃透明度">
          <div className="jfs-showcase-transparency-heading">
            <label htmlFor="jfs-showcase-opacity">玻璃透明度</label>
            <strong>{transparency}%</strong>
          </div>
          <input id="jfs-showcase-opacity" type="range"
            min={10} max={45} step={5} value={transparency}
            onChange={e => setTransparency(Number(e.currentTarget.value))}/>
          <p>白色不透明度 {100 - transparency}% · 黑色背景微微透出。此滑桿只調整展示預覽。</p>
        </div>
      )}
      <p className="jfs-showcase-feedback" aria-live="polite">
        {material === "crystal" ? "黑底白玻璃｜每塊面板都有半透明白色、立體邊緣與背景模糊" :
          material === "clear" ? "高透白玻璃｜黑底上更透明、可看出更明顯的玻璃景深" :
          "原本霧面｜實心背景、不使用玻璃模糊"}
      </p>
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
