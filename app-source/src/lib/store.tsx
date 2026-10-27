"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { initialState, validateState, type AppState } from "./domain";
import { useAuth } from "./auth-context";
import { REVIEW_PREVIEW, REVIEW_STORAGE_KEY, makeReviewSeed } from "./review-preview";
import { GUEST_USER_ID, GUEST_DATA_KEY, GUEST_IMPORT_SKIPPED } from "./guest-mode";

/** Original version is preserved until user confirms a manual import. */
export const STORAGE_KEY = "james-fitness-v1";
export const scopedStorageKey = (userId: string) =>
  `james-fitness-user-v1:${userId}`;
const skippedKey = (userId: string) => `james-fitness-import-skipped:${userId}`;

type Store = {
  state: AppState;
  ready: boolean;
  error: string;
  saving: boolean;
  save: (action: string, change: (s: AppState) => void) => boolean;
  reset: () => void;
  legacyAvailable: boolean;
  guestAvailable: boolean;
  importGuest: () => boolean;
  dismissGuest: () => void;
  importLegacy: () => boolean;
  dismissLegacy: () => void;
  storageKey: string | null;
};

const Context = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const userId = user?.id ?? null;
  const key = userId ? (REVIEW_PREVIEW ? REVIEW_STORAGE_KEY : scopedStorageKey(userId)) : null;
  const [state, setState] = useState(initialState);
  const ref = useRef(state);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [legacyAvailable, setLegacyAvailable] = useState(false);
  const [guestAvailable, setGuestAvailable] = useState(false);
  const blocked = useRef(false);
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    ref.current = initialState();
    setState(ref.current);
    loadedFor.current = null;
    setReady(false);
    setError("");
    setLegacyAvailable(false);
    setGuestAvailable(false);
    blocked.current = false;
    if (!authReady || !userId || !key) return;

    try {
      const raw = localStorage.getItem(key);
      const restored = raw ? validateState(JSON.parse(raw)) :
        REVIEW_PREVIEW ? makeReviewSeed() : initialState();
      if (!raw && REVIEW_PREVIEW) localStorage.setItem(key, JSON.stringify(restored));
      ref.current = restored;
      setState(restored);
      const guest=!REVIEW_PREVIEW && userId!==GUEST_USER_ID && !raw &&
        !!localStorage.getItem(GUEST_DATA_KEY) &&
        localStorage.getItem(GUEST_IMPORT_SKIPPED+userId)!=="true";
      setGuestAvailable(guest);
      const legacy = REVIEW_PREVIEW ? null : localStorage.getItem(STORAGE_KEY);
      setLegacyAvailable(
        !raw && legacy !== null && localStorage.getItem(skippedKey(userId)) !== "true",
      );
    } catch {
      blocked.current = true;
      setError("本機資料無法讀取，已停止寫入以保留原資料。請先匯出原始資料。");
    }
    loadedFor.current = userId;
    setReady(true);

    const sync = (event: StorageEvent) => {
      if (event.key !== key) return;
      try {
        const next = event.newValue
          ? validateState(JSON.parse(event.newValue))
          : initialState();
        ref.current = next;
        setState(next);
      } catch {
        blocked.current = true;
        setError("另一個分頁的資料無效，已停止寫入。");
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [authReady, userId, key]);

  function save(action: string, change: (s: AppState) => void) {
    if (!ready || !key || !userId ||
      loadedFor.current !== userId || blocked.current) return false;
    setSaving(true);
    try {
      const raw = localStorage.getItem(key);
      const disk = raw ? validateState(JSON.parse(raw)) : initialState();
      if (disk.revision !== ref.current.revision) {
        ref.current = disk;
        setState(disk);
        throw Error("另一個分頁已更新資料。已載入最新版本，請再操作一次。");
      }
      const next = structuredClone(ref.current);
      change(next);
      if (next.sessions.filter((s) => s.status === "in_progress").length > 1)
        throw Error("最多只能有一個進行中訓練");
      validateState(next);
      next.revision++;
      next.audit.push({
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        action,
      });
      localStorage.setItem(key, JSON.stringify(next));
      ref.current = next;
      setState(next);
      setError("");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "儲存失敗，資料未寫入");
      return false;
    } finally {
      requestAnimationFrame(() => setSaving(false));
    }
  }

  function reset() {
    if (!key || !userId || loadedFor.current !== userId) return;
    try {
      // Deleting an account's local data never deletes the unowned legacy
      // snapshot or another Google account's records on this device.
      localStorage.removeItem(key);
      const next = initialState();
      ref.current = next;
      setState(next);
      blocked.current = false;
      setError("");
      setLegacyAvailable(false);
      setGuestAvailable(false);
    } catch {
      setError("無法刪除本機資料");
    }
  }

  function importGuest(): boolean {
    if(REVIEW_PREVIEW || !key || !userId || userId===GUEST_USER_ID ||
      loadedFor.current!==userId || localStorage.getItem(key))return false;
    try {
      const raw=localStorage.getItem(GUEST_DATA_KEY);
      if(!raw)return false;
      const guestData=validateState(JSON.parse(raw));
      localStorage.setItem(key,JSON.stringify(guestData));
      ref.current=guestData;
      setState(guestData);
      setGuestAvailable(false);
      setError("");
      return true;
    } catch {
      setError("訪客資料無法匯入。原始資料仍保存在本機，請先匯出備份。");
      return false;
    }
  }

  function dismissGuest() {
    if(!userId)return;
    try {localStorage.setItem(GUEST_IMPORT_SKIPPED+userId,"true");}catch{}
    setGuestAvailable(false);
  }

  function importLegacy(): boolean {
    if (REVIEW_PREVIEW || !key || !userId || loadedFor.current !== userId ||
      localStorage.getItem(key)) return false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const previous = validateState(JSON.parse(raw));
      localStorage.setItem(key, JSON.stringify(previous));
      ref.current = previous;
      setState(previous);
      setLegacyAvailable(false);
      setError("");
      // Keep old backup untouched until cloud migration is verified.
      return true;
    } catch {
      setError("舊版紀錄無法匯入。原始紀錄保持不變，請先匯出備份。");
      return false;
    }
  }

  function dismissLegacy() {
    if (!userId) return;
    try { localStorage.setItem(skippedKey(userId), "true"); } catch {}
    setLegacyAvailable(false);
  }

  return (
    <Context.Provider value={{
      state, ready, error, saving, save, reset,
      legacyAvailable, guestAvailable, importGuest, dismissGuest, importLegacy, dismissLegacy, storageKey: key,
    }}>
      {children}
    </Context.Provider>
  );
}

export function useStore() {
  const value = useContext(Context);
  if (!value) throw Error("Missing StoreProvider");
  return value;
}

export function useGuestData() {
  const {guestAvailable,importGuest,dismissGuest}=useStore();
  return {guestAvailable,importGuest,dismissGuest};
}

export function useLegacyData() {
  const { legacyAvailable, importLegacy, dismissLegacy } = useStore();
  return { legacyAvailable, importLegacy, dismissLegacy };
}
