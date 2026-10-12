"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
export function AppearanceController() {
  const { state } = useStore();
  const mode = state.appearance?.theme ?? "dark";
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      const light = mode === "system" && media.matches;
      document.documentElement.dataset.theme = light ? "light" : "dark";
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", light ? "#F5F3EE" : "#070708");
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
export function AppearanceSettings({
  notify,
}: {
  notify: (message: string) => void;
}) {
  const { state, save, saving } = useStore();
  const prefs = state.appearance ?? {
    theme: "dark" as const,
    showCompanion: true,
  };
  return (
    <section className="card stack" aria-label="外觀設定">
      <h2>Appearance</h2>
      <p className="muted">外觀偏好會保存在這個裝置，儲存後留在此頁。</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          if (
            save("更新外觀設定", (s) => {
              s.appearance = {
                theme: data.get("theme") === "system" ? "system" : "dark",
                showCompanion: data.get("companion") === "on",
              };
            })
          )
            notify("外觀已儲存");
        }}
      >
        <label className="field">
          <span>顯示模式</span>
          <select name="theme" defaultValue={prefs.theme} key={prefs.theme}>
            <option value="dark">Dark · 深色</option>
            <option value="system">Follow System · 跟隨系統</option>
          </select>
        </label>
        <label className="check">
          <input
            name="companion"
            type="checkbox"
            defaultChecked={prefs.showCompanion}
            key={String(prefs.showCompanion)}
          />
          顯示 Companion
        </label>
        <p className="muted">
          跟隨系統時可切換淺色。角色自動支援減少動態與無法使用 3D 時的替代顯示。
        </p>
        <button className="button" disabled={saving} aria-busy={saving}>
          儲存外觀
        </button>
      </form>
    </section>
  );
}
