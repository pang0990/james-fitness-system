"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GUEST_MODE_KEY } from "@/lib/guest-mode";
import { appHref, supabase } from "@/lib/supabase-browser";
import { useLegacyData, useGuestData } from "@/lib/store";

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
      // Preserve all account/legacy/guest snapshots for explicit migration.
      // Cloud loading determines whether this account already has data.
      localStorage.removeItem(GUEST_MODE_KEY);
      window.location.replace(appHref("today"));
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
            <Link className="jfs-auth-button" href="/">RETRY GOOGLE SIGN IN</Link>
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
      <small>原始紀錄不會刪除。複製到目前 Google 帳號後，待安全的雲端同步連線成功才會上傳。</small>
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


/** Explicit, lossless guest-to-account copy; never overwrites an existing account. */
export function GuestDataOffer() {
  const {guestAvailable,importGuest,dismissGuest}=useGuestData();
  if(!guestAvailable)return null;
  return (
    <aside className="jfs-legacy-notice" aria-label="訪客訓練紀錄轉移">
      <p>這台裝置有訪客訓練紀錄，要複製到目前登入的帳號嗎？</p>
      <small>訪客原始紀錄不刪除，也不覆蓋已有帳號資料。複製後待安全的雲端同步連線成功才會上傳。</small>
      <div>
        <button type="button" onClick={()=>{
          if(window.confirm("確認複製訪客紀錄到這個空白帳號的本機資料？原訪客紀錄將完整保留。"))
            importGuest();
        }}>複製訪客紀錄</button>
        <button type="button" onClick={dismissGuest}>暫不轉移</button>
      </div>
    </aside>
  );
}

