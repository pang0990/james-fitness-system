import { validateState, type AppState } from "./domain";
import { supabase } from "./supabase-browser";

/** Cloud revision is independent of AppState.revision (local action history). */
export type CloudSnapshot = { cloudRevision: number; state: AppState };
export type CloudMeta = { cloudRevision: number; localRevision: number };
export type SyncDecision = "download" | "upload" | "synced" | "conflict";

export const cloudMetaKey = (id: string) => "jfs-cloud-meta-v1:" + id;
export const cloudBackupKey = (id: string) =>
  "jfs-cloud-conflict-backup:" + id + ":" + new Date().toISOString();

export function readCloudMeta(raw: string | null): CloudMeta | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const candidate = value as CloudMeta;
    return Number.isSafeInteger(candidate.cloudRevision) && candidate.cloudRevision >= 0 &&
      Number.isSafeInteger(candidate.localRevision) && candidate.localRevision >= 0
      ? candidate : null;
  } catch {
    return null;
  }
}

/** Never silently resolve a two-device divergence or a deleted cloud row. */
export function decideCloudSync(
  local: AppState | null,
  remote: CloudSnapshot | null,
  meta: CloudMeta | null,
): SyncDecision {
  if (!remote) {
    if (meta && meta.cloudRevision > 0) return "conflict";
    return local ? "upload" : "synced";
  }
  if (!local) return "download";
  if (meta && meta.cloudRevision === remote.cloudRevision) {
    return meta.localRevision === local.revision ? "synced" : "upload";
  }
  if (meta && meta.localRevision === local.revision) return "download";
  if (JSON.stringify(local) === JSON.stringify(remote.state)) return "synced";
  return "conflict";
}

export async function readCloudSnapshot(ownerId: string): Promise<CloudSnapshot | null> {
  const { data, error } = await supabase
    .from("jfs_account_snapshots")
    .select("cloud_revision, state")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const cloudRevision = Number(data.cloud_revision);
  if (!Number.isSafeInteger(cloudRevision) || cloudRevision <= 0)
    throw Error("無效的雲端版本，已停止覆寫。");
  return { cloudRevision, state: validateState(data.state) };
}

export async function pushCloudSnapshot(
  expectedRevision: number,
  state: AppState,
): Promise<number> {
  const { data, error } = await supabase.rpc("jfs_save_account_snapshot", {
    p_expected_revision: expectedRevision,
    p_state: state,
  });
  if (error) throw error;
  const revision = Number(data);
  if (!Number.isSafeInteger(revision) || revision <= expectedRevision)
    throw Error("雲端未確認儲存版本，資料保留在本機。");
  return revision;
}

export function cloudErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/JFS_SYNC_CONFLICT|23505|409/.test(message)) return "兩部裝置的資料版本不同，請先解決同步衝突。";
  if (/does not exist|schema cache|PGRST202|PGRST205/i.test(message))
    return "雲端資料庫尚未完成啟用。紀錄仍安全保存在這台裝置。";
  return "暫時無法連上雲端；本機紀錄已保留，連線後會再試。";
}
