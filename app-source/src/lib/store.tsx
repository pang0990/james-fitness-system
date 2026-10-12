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
export const STORAGE_KEY = "james-fitness-v1";
type Store = {
  state: AppState;
  ready: boolean;
  error: string;
  saving: boolean;
  save: (action: string, change: (s: AppState) => void) => boolean;
  reset: () => void;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState);
  const ref = useRef(state);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const blocked = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = validateState(JSON.parse(raw));
        ref.current = s;
        setState(s);
      }
    } catch {
      blocked.current = true;
      setError("本機資料無法讀取，已停止寫入以保留原資料。請先匯出原始資料。");
    }
    setReady(true);
    const sync = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      try {
        const s = e.newValue
          ? validateState(JSON.parse(e.newValue))
          : initialState();
        ref.current = s;
        setState(s);
      } catch {
        blocked.current = true;
        setError("另一個分頁的資料無效，已停止寫入。");
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function save(action: string, change: (s: AppState) => void) {
    if (!ready || blocked.current) return false;
    setSaving(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
    try {
      localStorage.removeItem(STORAGE_KEY);
      const next = initialState();
      ref.current = next;
      setState(next);
      blocked.current = false;
      setError("");
    } catch {
      setError("無法刪除本機資料");
    }
  }
  return (
    <Context.Provider value={{ state, ready, error, saving, save, reset }}>
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const value = useContext(Context);
  if (!value) throw Error("Missing StoreProvider");
  return value;
}
