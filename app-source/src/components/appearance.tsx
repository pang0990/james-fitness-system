"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

/** Historic appearance fields remain readable without enabling retired skins. */
export function AppearanceController() {
  const { state } = useStore();
  useEffect(() => {
    // Historical dark/system preferences remain in backups but no longer
    // affect the single official Light Mode UI.
    document.documentElement.dataset.theme = "light";
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", "#f7f8f5");
  }, []);

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
  void notify;
  return (
    <section className="card stack jfs-appearance-settings" aria-label="外觀設定">
      <h2>Light Mode</h2>
      <p className="muted">這是 James Fitness System 唯一的正式視覺版本。舊帳戶的外觀偏好仍保留於資料中，但不再切換介面風格；飲食、訓練與歷史紀錄不受影響。</p>
    </section>
  );
}
