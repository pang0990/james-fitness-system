"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

/** Visual style and light/dark preference are separate concerns.
 * Historic appearance objects without visualStyle open the new Minimal theme
 * in light mode, while their original 2077 assets and CSS remain untouched.
 */
export function AppearanceController() {
  const { state } = useStore();
  const visualStyle = state.appearance?.visualStyle ?? "minimal";
  const mode = state.appearance?.visualStyle
    ? state.appearance.theme
    : visualStyle === "minimal" ? "light" : state.appearance?.theme ?? "dark";

  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      const light = mode === "light" || (mode === "system" && media.matches);
      document.documentElement.dataset.visualStyle = visualStyle;
      document.documentElement.dataset.theme = light ? "light" : "dark";
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", visualStyle === "minimal"
          ? (light ? "#f5f5f7" : "#111216")
          : (light ? "#f5f3ee" : "#070708"));
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [visualStyle, mode]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(
      state.preferences?.reduceMotion ?? false,
    );
    document.documentElement.dataset.reduceTransparency = String(
      state.preferences?.reduceTransparency ?? false,
    );
  }, [state.preferences]);
  return null;
}

export function AppearanceSettings({ notify }: { notify: (message: string) => void }) {
  const { state, save, saving } = useStore();
  const prefs = state.appearance;
  const [visualStyle, setVisualStyle] = useState<"minimal" | "cinematic">(
    prefs?.visualStyle ?? "minimal",
  );
  const [mode, setMode] = useState<"light" | "dark" | "system">(
    prefs?.visualStyle ? prefs.theme : "light",
  );
  const [showCompanion, setShowCompanion] = useState(prefs?.showCompanion !== false);

  return (
    <section className="card stack jfs-appearance-settings" aria-label="外觀設定">
      <h2>視覺風格</h2>
      <p className="muted">切換整個 App 的視覺外觀，不影響訓練、飲食或任何歷史紀錄。設定儲存於目前瀏覽器。</p>
      <form onSubmit={(e) => {
        e.preventDefault();
        if (save("更新外觀設定", (s) => {
          s.appearance = { visualStyle, theme: mode, showCompanion };
        })) notify("視覺風格已套用");
      }}>
        <fieldset className="jfs-style-options">
          <legend>選擇主題</legend>
          <label className={`jfs-style-option ${visualStyle === "minimal" ? "selected" : ""}`}>
            <input type="radio" name="visualStyle" value="minimal"
              checked={visualStyle === "minimal"}
              onChange={() => { setVisualStyle("minimal"); setMode("light"); }} />
            <span className="jfs-style-swatch jfs-style-swatch-minimal" aria-hidden="true"><i /><i /><i /></span>
            <strong>Minimal</strong><small>蘋果式極簡 · 純淨、清晰、專注內容</small>
          </label>
          <label className={`jfs-style-option ${visualStyle === "cinematic" ? "selected" : ""}`}>
            <input type="radio" name="visualStyle" value="cinematic"
              checked={visualStyle === "cinematic"}
              onChange={() => { setVisualStyle("cinematic"); setMode("dark"); }} />
            <span className="jfs-style-swatch jfs-style-swatch-cinematic" aria-hidden="true"><i /><i /><i /></span>
            <strong>2077 · Cinematic</strong><small>完整保留原版霓虹城市與黑金視覺</small>
          </label>
        </fieldset>
        <label className="field">
          <span>明暗模式</span>
          <select name="theme" value={mode} onChange={(e) => setMode(e.target.value as "light" | "dark" | "system")}>
            {visualStyle === "minimal" && <option value="light">Light · 淺色</option>}
            <option value="dark">Dark · 深色</option>
            <option value="system">Follow System · 跟隨系統</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={showCompanion}
            onChange={(e) => setShowCompanion(e.target.checked)} />
          顯示 Companion（原有偏好）
        </label>
        <p className="muted">2077 風格完全保留。Minimal 主題不顯示城市插畫；再次切回 2077 即可恢復原畫面。</p>
        <button type="submit" className="button" disabled={saving} aria-busy={saving}>
          儲存並套用
        </button>
      </form>
    </section>
  );
}
