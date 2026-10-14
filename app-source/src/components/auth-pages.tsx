"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { appHref, supabase } from "@/lib/supabase-browser";
import { scopedStorageKey, STORAGE_KEY } from "@/lib/store";

export function GoogleLogin() {
  const { user, ready, error, signInGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  return (
    <main className="jfs-auth-screen">
      <div className="jfs-auth-backdrop" aria-hidden="true" />
      <section className="jfs-auth-panel">
        <p className="jfs-auth-kicker">JAMES FITNESS SYSTEM</p>
        <span className="jfs-auth-mark" aria-hidden="true">J</span>
        <h1>{user ? "WELCOME BACK" : "THE JOURNEY STARTS HERE"}</h1>
        {ready && user ? (
          <>
            <p className="jfs-auth-support">{user.email ?? "Google 帳號已連接"}</p>
            <Link className="jfs-auth-button" href="/today">CONTINUE TO TODAY →</Link>
          </>
        ) : (
          <>
            <p className="jfs-auth-support">以 Google 帳號繼續</p>
            <button className="jfs-auth-button" disabled={!ready || busy}
              onClick={async () => {
                setBusy(true);
                try { await signInGoogle(); }
                finally { setBusy(false); }
              }}>
              <span className="jfs-google-g" aria-hidden="true">G</span>
              {busy ? "CONNECTING…" : "CONTINUE WITH GOOGLE"}
            </button>
          </>
        )}
        {error && <p className="jfs-auth-error" role="alert">{error}</p>}
        <p className="jfs-auth-footnote">
          目前先開通安全登入。健身紀錄仍保存在本機，尚未跨裝置同步。
        </p>
      </section>
    </main>
  );
}

/** Static GitHub Pages callback for Supabase Google OAuth PKCE. */
export function GoogleCallback() {
  const run = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (run.current) return;
    run.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const providerError = params.get("error_description") || params.get("error");

    if (providerError || !code) {
      setError(providerError ? "Google 登入未完成，請重新嘗試。" : "登入連結缺少驗證資料。");
      return;
    }

    void supabase.auth.exchangeCodeForSession(code).then(({ data, error: err }) => {
      if (err || !data.user) {
        setError("登入驗證失敗或已過期，請重新使用 Google 登入。");
        return;
      }
      // Remove OAuth code from browser history before leaving callback.
      window.history.replaceState(null, "", window.location.pathname);
      const key = scopedStorageKey(data.user.id);
      const hasAccountData = Boolean(localStorage.getItem(key));
      const hasLegacyData = Boolean(localStorage.getItem(STORAGE_KEY));
      // Never automatically assign old browser records to a new Google user.
      window.location.replace(appHref(hasAccountData || hasLegacyData ? "today" : "onboarding"));
    }).catch(() => setError("登入驗證時網路中斷，請重試。"));
  }, []);

  return (
    <main className="jfs-auth-screen">
      <section className="jfs-auth-panel">
        <p className="jfs-auth-kicker">JAMES FITNESS SYSTEM</p>
        <h1>{error ? "SIGN IN FAILED" : "CONNECTING…"}</h1>
        {error ? (
          <>
            <p className="jfs-auth-error" role="alert">{error}</p>
            <Link className="jfs-auth-button" href="/login">RETRY GOOGLE SIGN IN</Link>
          </>
        ) : <p className="jfs-auth-support" role="status">正在確認 Google 帳號</p>}
      </section>
    </main>
  );
}

/** Explicit adoption of unowned legacy browser data, never automatic. */
export function LegacyDataOffer() {
  const { legacyAvailable, importLegacy, dismissLegacy } = useLegacyData();
  if (!legacyAvailable) return null;
  return (
    <aside className="jfs-legacy-notice" aria-label="舊版紀錄轉移">
      <p>這台裝置有舊版健身紀錄。要將它保留到目前的 Google 帳號嗎？</p>
      <small>此操作只會複製到本機帳號資料，尚未上傳雲端。舊紀錄不會刪除。</small>
      <div>
        <button onClick={() => {
          if (window.confirm("確認將舊版紀錄複製至目前的 Google 帳號？請先確認這些資料屬於你。"))
            importLegacy();
        }}>使用舊版紀錄</button>
        <button onClick={dismissLegacy}>稍後再說</button>
      </div>
    </aside>
  );
}

// Kept below the component so the account import UI cannot read unowned data.
import { useLegacyData } from "@/lib/store";
