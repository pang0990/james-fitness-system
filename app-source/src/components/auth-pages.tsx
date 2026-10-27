"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { REVIEW_PREVIEW } from "@/lib/review-preview";
import { GUEST_DATA_KEY, GUEST_MODE_KEY } from "@/lib/guest-mode";
import { appHref, supabase } from "@/lib/supabase-browser";
import { scopedStorageKey, STORAGE_KEY, useLegacyData } from "@/lib/store";

export function GoogleLogin() {
  const { user, ready, error, signInGoogle, continueAsGuest, isGuest } = useAuth();
  const [busy, setBusy] = useState(false);
  const signedIn = !!user && !isGuest && !REVIEW_PREVIEW;

  return (
    <main className="jfs-auth-screen">
      <div className="jfs-auth-backdrop" aria-hidden="true" />
      <section className="jfs-auth-panel" aria-label="開始使用 James Fitness System">
        <div className="jfs-auth-mark" aria-hidden="true">J</div>
        <h1>{signedIn ? "歡迎回來。" : "訓練，由你開始。"}</h1>
        <p className="jfs-auth-support">
          {signedIn ? user?.email : "保持專注。記錄每一次訓練與日常進步。"}
        </p>
        {signedIn ? (
          <Link className="jfs-auth-button" href="/today">繼續使用 <span aria-hidden="true">→</span></Link>
        ) : (
          <div className="jfs-auth-actions">
            <button className="jfs-auth-button" type="button" disabled={!ready}
              onClick={continueAsGuest}>
              {REVIEW_PREVIEW ? "開始測試體驗" : isGuest ? "繼續訪客模式" : "不登入，直接開始"}
              <span aria-hidden="true">→</span>
            </button>
            {!REVIEW_PREVIEW && (
              <button className="jfs-auth-button jfs-auth-button-secondary" disabled={!ready || busy}
                onClick={async () => {
                  setBusy(true);
                  try { await signInGoogle(); }
                  finally { setBusy(false); }
                }}>
                {busy ? "正在連線…" : "使用 Google 帳號登入"}
              </button>
            )}
          </div>
        )}
        {error && <p className="jfs-auth-error" role="alert">{error}</p>}
        <p className="jfs-auth-footnote">
          {REVIEW_PREVIEW
            ? "測試版本使用虛構資料，不連接正式帳戶。"
            : "訪客資料只保存在這台裝置，不會自動上傳。登入後可自行選擇是否轉移，原始紀錄不會自動覆寫。"}
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
      const hasGuestData = Boolean(localStorage.getItem(GUEST_DATA_KEY));
      localStorage.removeItem(GUEST_MODE_KEY);
      // Never automatically assign old browser records to a new Google user.
      window.location.replace(appHref(hasAccountData || hasLegacyData || hasGuestData ? "today" : "onboarding"));
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

