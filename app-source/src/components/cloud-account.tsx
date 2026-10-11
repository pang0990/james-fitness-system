"use client";
import { useState, type FormEvent } from "react";
import { Cloud, RefreshCw, LogOut, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { Field } from "./daily";

export function CloudAccount() {
  const {
    cloud,
    signInCloud,
    signUpCloud,
    signOutCloudAccount,
    deleteCloudAccountData,
    syncCloudNow,
  } = useStore();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const email = String(d.get("email") || "").trim();
    const password = String(d.get("password") || "");
    if (mode === "signin") await signInCloud(email, password);
    else await signUpCloud(email, password);
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2><Cloud size={19} /> Cloud Sync</h2>
        <span className="tag">
          {!cloud.enabled ? "NOT CONFIGURED" : cloud.signedIn ? "CONNECTED" : "LOCAL"}
        </span>
      </div>
      {!cloud.enabled ? (
        <p className="muted">
          設定 NEXT_PUBLIC_SUPABASE_URL 與 NEXT_PUBLIC_SUPABASE_ANON_KEY 後即可啟用帳號與跨裝置同步。
        </p>
      ) : cloud.signedIn ? (
        <>
          <p>{cloud.email || "已登入"}</p>
          <p className="muted">
            {cloud.syncing ? "正在同步…" : cloud.error || "本機變更會同步到此帳號；登入其他裝置可載入同一份資料。"}
          </p>
          <div className="form-actions">
            <button className="button secondary" onClick={() => syncCloudNow()}>
              <RefreshCw size={15} /> 立即同步
            </button>
            <button className="button secondary" onClick={() => signOutCloudAccount()}>
              <LogOut size={15} /> 登出雲端
            </button>
          </div>
          <div className="danger-zone">
            <h3>Delete account</h3>
            <p className="muted">
              永久刪除雲端帳號與同步資料，並清除這台裝置上的本機資料。這不是停用帳號。
            </p>
            <button
              className="button secondary danger"
              disabled={cloud.syncing}
              onClick={async () => {
                const ok = window.confirm(
                  "確定要永久刪除帳號與所有同步資料嗎？這個動作無法復原。",
                );
                if (ok) await deleteCloudAccountData();
              }}
            >
              <Trash2 size={15} /> 永久刪除帳號
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="pill-row">
            <button aria-pressed={mode === "signin"} onClick={() => setMode("signin")}>登入</button>
            <button aria-pressed={mode === "signup"} onClick={() => setMode("signup")}>建立帳號</button>
          </div>
          <form onSubmit={submit}>
            <Field label="Email">
              <input name="email" type="email" autoComplete="email" required />
            </Field>
            <Field label="Password">
              <input
                name="password"
                type="password"
                minLength={8}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
              />
            </Field>
            <button className="button" disabled={cloud.syncing}>
              {mode === "signin" ? "登入並同步" : "建立帳號"}
            </button>
            {cloud.error && <p className="form-error">{cloud.error}</p>}
          </form>
        </>
      )}
    </section>
  );
}