"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";

const statusText = {
  preview: "隔離預覽，不連接雲端",
  checking: "正在核對雲端版本…",
  synced: "雲端已同步",
  offline: "等待雲端連線",
  unavailable: "雲端尚未啟用",
  conflict: "需要處理同步衝突",
} as const;

export function CloudSyncBadge() {
  const { syncStatus } = useStore();
  if (syncStatus === "preview") return null;
  return (
    <span className="jfs-sync-badge" role="status" aria-live="polite"
      data-status={syncStatus}>{statusText[syncStatus]}</span>
  );
}

export function CloudSyncPanel() {
  const { syncStatus, syncError, resolveCloudConflict } = useStore();
  const [busy, setBusy] = useState(false);
  async function resolve(source: "cloud" | "local") {
    const message = source === "cloud"
      ? "確定改用雲端版本？此裝置目前的資料會先保存為本機衝突備份。"
      : "確定將本機版本覆寫到雲端？目前雲端版本會先保存為本機衝突備份，其他裝置需要重新載入。";
    if (!window.confirm(message)) return;
    setBusy(true);
    try {
      await resolveCloudConflict(source);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card stack jfs-sync-panel" aria-label="雲端同步">
      <h2>資料同步</h2>
      <p role="status" className="jfs-sync-message">{statusText[syncStatus]}</p>
      <p className="muted">
        每個 Google 帳號獨立存取；本機可離線記錄，重新連線後依版本安全同步。
        只有顯示「雲端已同步」才能確認遠端儲存成功。
      </p>
      {syncError && <p role="alert" className="jfs-sync-error">{syncError}</p>}
      {syncStatus === "conflict" && (
        <div className="form-actions">
          <button className="button secondary" type="button" disabled={busy}
            onClick={() => void resolve("cloud")}>採用雲端版本</button>
          <button className="button secondary" type="button" disabled={busy}
            onClick={() => void resolve("local")}>採用本機版本</button>
        </div>
      )}
      {syncStatus === "conflict" && <small>解決衝突前不會覆蓋任何版本；請先匯出目前 JSON 備份。</small>}
    </section>
  );
}
