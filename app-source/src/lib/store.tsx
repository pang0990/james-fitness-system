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
import {
  cloudConfigured,
  deleteCloudAccount,
  pullCloudState,
  pushCloudState,
  restoreCloudSession,
  signInPassword,
  signOutCloud,
  signUpPassword,
  type CloudSession,
} from "./cloud";

export const STORAGE_KEY = "james-fitness-v1";

type CloudState = {
  enabled: boolean;
  signedIn: boolean;
  email?: string;
  syncing: boolean;
  error: string;
};

type Store = {
  state: AppState;
  ready: boolean;
  error: string;
  saving: boolean;
  cloud: CloudState;
  save: (action: string, change: (s: AppState) => void) => boolean;
  reset: () => void;
  signInCloud: (email: string, password: string) => Promise<boolean>;
  signUpCloud: (email: string, password: string) => Promise<boolean>;
  signOutCloudAccount: () => Promise<void>;
  deleteCloudAccountData: () => Promise<boolean>;
  syncCloudNow: () => Promise<boolean>;
};

const Context = createContext<Store | null>(null);

function cloudSnapshot(session: CloudSession | null, patch: Partial<CloudState> = {}): CloudState {
  return {
    enabled: cloudConfigured(),
    signedIn: Boolean(session),
    email: session?.user.email,
    syncing: false,
    error: "",
    ...patch,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState);
  const ref = useRef(state);
  const cloudSession = useRef<CloudSession | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [cloud, setCloud] = useState<CloudState>(() => cloudSnapshot(null));
  const blocked = useRef(false);

  function adopt(next: AppState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    ref.current = next;
    setState(next);
  }

  async function reconcileCloud(local: AppState) {
    if (!cloudConfigured()) {
      setCloud(cloudSnapshot(null));
      return;
    }
    setCloud((c) => ({ ...c, syncing: true, error: "" }));
    try {
      const session = await restoreCloudSession();
      cloudSession.current = session;
      if (!session) {
        setCloud(cloudSnapshot(null));
        return;
      }
      const remote = await pullCloudState();
      if (!remote) {
        await pushCloudState(local);
      } else {
        const parsed = validateState(remote.state);
        if (remote.revision > local.revision) adopt(parsed);
        else if (local.revision > remote.revision) await pushCloudState(local);
      }
      setCloud(cloudSnapshot(session));
    } catch (e) {
      setCloud(
        cloudSnapshot(cloudSession.current, {
          error: e instanceof Error ? e.message : "雲端同步失敗",
        }),
      );
    }
  }

  useEffect(() => {
    let local = initialState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        local = validateState(JSON.parse(raw));
        ref.current = local;
        setState(local);
      }
    } catch {
      blocked.current = true;
      setError("本機資料無法讀取，已停止寫入以保留原資料。請先匯出原始資料。");
    }
    setReady(true);
    void reconcileCloud(local);

    const sync = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      try {
        const s = e.newValue ? validateState(JSON.parse(e.newValue)) : initialState();
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

  function queueCloud(next: AppState) {
    if (!cloudSession.current) return;
    setCloud((c) => ({ ...c, syncing: true, error: "" }));
    void pushCloudState(next)
      .then((session) => {
        cloudSession.current = session;
        setCloud(cloudSnapshot(session));
      })
      .catch((e) =>
        setCloud((c) => ({
          ...c,
          syncing: false,
          error: e instanceof Error ? e.message : "雲端同步失敗",
        })),
      );
  }

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
      next.revision++;
      next.audit.push({
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        action,
      });
      adopt(next);
      queueCloud(next);
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

  async function finishSignIn(session: CloudSession | null) {
    if (!session) {
      setCloud((c) => ({
        ...c,
        syncing: false,
        error: "帳號已建立，但目前需要先完成 Email 驗證後再登入。",
      }));
      return false;
    }
    cloudSession.current = session;
    setCloud(cloudSnapshot(session, { syncing: true }));
    try {
      const remote = await pullCloudState();
      if (remote) {
        const parsed = validateState(remote.state);
        adopt(parsed);
      } else {
        await pushCloudState(ref.current);
      }
      setCloud(cloudSnapshot(session));
      return true;
    } catch (e) {
      setCloud(
        cloudSnapshot(session, {
          error: e instanceof Error ? e.message : "登入後同步失敗",
        }),
      );
      return false;
    }
  }

  async function signInCloud(email: string, password: string) {
    setCloud((c) => ({ ...c, syncing: true, error: "" }));
    try {
      return await finishSignIn(await signInPassword(email, password));
    } catch (e) {
      setCloud((c) => ({
        ...c,
        syncing: false,
        error: e instanceof Error ? e.message : "登入失敗",
      }));
      return false;
    }
  }

  async function signUpCloud(email: string, password: string) {
    setCloud((c) => ({ ...c, syncing: true, error: "" }));
    try {
      return await finishSignIn(await signUpPassword(email, password));
    } catch (e) {
      setCloud((c) => ({
        ...c,
        syncing: false,
        error: e instanceof Error ? e.message : "建立帳號失敗",
      }));
      return false;
    }
  }

  async function signOutCloudAccount() {
    setCloud((c) => ({ ...c, syncing: true, error: "" }));
    await signOutCloud();
    cloudSession.current = null;
    setCloud(cloudSnapshot(null));
  }

  async function deleteCloudAccountData() {
    if (!cloudSession.current) return false;
    setCloud((c) => ({ ...c, syncing: true, error: "" }));
    try {
      await deleteCloudAccount();
      cloudSession.current = null;
      localStorage.removeItem(STORAGE_KEY);
      const next = initialState();
      ref.current = next;
      setState(next);
      blocked.current = false;
      setError("");
      setCloud(cloudSnapshot(null));
      return true;
    } catch (e) {
      setCloud((c) => ({
        ...c,
        syncing: false,
        error: e instanceof Error ? e.message : "刪除帳號失敗",
      }));
      return false;
    }
  }

  async function syncCloudNow() {
    if (!cloudSession.current) return false;
    setCloud((c) => ({ ...c, syncing: true, error: "" }));
    try {
      const remote = await pullCloudState();
      if (remote && remote.revision > ref.current.revision) {
        adopt(validateState(remote.state));
      } else {
        await pushCloudState(ref.current);
      }
      const session = await restoreCloudSession();
      cloudSession.current = session;
      setCloud(cloudSnapshot(session));
      return true;
    } catch (e) {
      setCloud((c) => ({
        ...c,
        syncing: false,
        error: e instanceof Error ? e.message : "同步失敗",
      }));
      return false;
    }
  }

  return (
    <Context.Provider
      value={{
        state,
        ready,
        error,
        saving,
        cloud,
        save,
        reset,
        signInCloud,
        signUpCloud,
        signOutCloudAccount,
        deleteCloudAccountData,
        syncCloudNow,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useStore() {
  const value = useContext(Context);
  if (!value) throw Error("Missing StoreProvider");
  return value;
}