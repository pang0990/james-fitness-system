"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

/** Historic appearance fields remain readable without enabling retired skins. */
export function AppearanceController() {
  const { state } = useStore();
  const mode = state.appearance?.theme ?? "light";
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      const light = mode === "light" || (mode === "system" && media.matches);

      document.documentElement.dataset.theme = light ? "light" : "dark";
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", light ? "#f8f8f6" : "#17241f");
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [mode]);

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
  const [mode, setMode] = useState<"light" | "dark" | "system">(prefs?.theme ?? "light");
  return (
    <section className="card stack jfs-appearance-settings" aria-label="外觀設定">
      <h2>視覺風格</h2>
      <p className="muted">切換整個 App 的視覺外觀，不影響訓練、飲食或任何歷史紀錄。設定儲存於目前瀏覽器。</p>
      <form onSubmit={(e) => {
        e.preventDefault();
        if (save("更新外觀設定", (s) => {
          s.appearance = { showCompanion: false, ...s.appearance, theme: mode };
        })) notify("視覺風格已套用");
      }}>
        <label className="field">
          <span>明暗模式</span>
          <select name="theme" value={mode} onChange={(e) => setMode(e.target.value as "light" | "dark" | "system")}>
            <option value="light">Light · 淺色</option>
            <option value="dark">Dark · 深色</option>
            <option value="system">Follow System · 跟隨系統</option>
          </select>
        </label>
        <button type="submit" className="button" disabled={saving} aria-busy={saving}>
          儲存並套用
        </button>
      </form>
    </section>
  );
}
