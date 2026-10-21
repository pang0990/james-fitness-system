"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { appHref, supabase } from "./supabase-browser";
import { REVIEW_PREVIEW, REVIEW_USER_ID } from "./review-preview";

type Auth = {
  user: User | null;
  ready: boolean;
  error: string;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Context = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (REVIEW_PREVIEW) {
      // A synthetic local-only identity, never a Supabase session or JWT.
      setUser({
        id: REVIEW_USER_ID, aud: "authenticated", role: "authenticated",
        email: "preview@example.invalid", app_metadata: { provider: "review" },
        user_metadata: {}, created_at: "2026-01-01T00:00:00.000Z",
      } as User);
      setReady(true);
      return;
    }
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        setUser(session?.user ?? null);
        setReady(true);
      },
    );

    // Supabase persists a local session for devices that have signed in.
    // A cached session permits offline local use but is not a cloud permission.
    void supabase.auth.getSession().then(({ data, error: err }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      if (err) setError("無法讀取帳號狀態，請重新登入。");
      setReady(true);
    }).catch(() => {
      if (active) {
        setReady(true);
        setError("無法初始化登入，請稍後再試。");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInGoogle = useCallback(async () => {
    setError("");
    if (REVIEW_PREVIEW) { setError("示範環境不使用真實 Google 登入。"); return; }
    if (!navigator.onLine) {
      setError("首次 Google 登入需要網路連線。");
      return;
    }
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${appHref("auth/callback")}`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (err) setError("Google 登入無法啟動，請稍後重試。");
  }, []);

  const signOut = useCallback(async () => {
    setError("");
    if (REVIEW_PREVIEW) { setError("此為本機測試版；可使用上方按鈕重設虛構資料。"); return; }
    // Offline sign-out is not a confirmed server-side revocation.
    if (!navigator.onLine) {
      setError("目前離線，請連線後再登出。");
      return;
    }
    const { error: err } = await supabase.auth.signOut();
    if (err) {
      setError("登出失敗，請重新嘗試。");
      return;
    }
    setUser(null);
    window.location.assign(appHref("login"));
  }, []);

  return (
    <Context.Provider value={{ user, ready, error, signInGoogle, signOut }}>
      {children}
    </Context.Provider>
  );
}

export function useAuth() {
  const auth = useContext(Context);
  if (!auth) throw Error("Missing AuthProvider");
  return auth;
}
