"use client";
import { AppearanceSettings } from "@/components/appearance";
import { CloudSyncPanel } from "@/components/cloud-status";
import { DataTools } from "@/components/data-tools";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Droplet,
  Plus,
  ShieldCheck,
  Trash2,
  Utensils,
  Download,
  Info,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { dateInZone } from "@/lib/domain";

import {
  Heading,
  Card,
  Field,
  NumberField,
} from "@/components/ui/page-content";
export function SettingsPage({
  path,
  notify,
}: {
  path: string;
  notify: (m?: string) => void;
}) {
  const { state, save, reset, storageKey } = useStore();
  const [slot, setSlot] = useState("");
  const router = useRouter();
  function download(raw = false) {
    const content = raw
      ? storageKey
        ? (localStorage.getItem(storageKey) ?? "{}")
        : "{}"
      : JSON.stringify(state, null, 2);
    const url = URL.createObjectURL(
      new Blob([content], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `james-fitness-backup-${dateInZone()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("備份已匯出");
  }
  return (
    <>
      <Heading
        eyebrow="MAKE IT YOURS"
        title={
          path === "settings/privacy"
            ? "隱私說明"
            : path === "settings/data"
              ? "資料管理"
              : "Settings"
        }
      />
      <div className="narrow stack">
        {path === "settings/appearance" ? (
          <AppearanceSettings notify={notify} />
        ) : path === "settings/privacy" ? (
          <Card title="個人資料與雲端同步" icon={ShieldCheck}>
            <div className="stack">
              <p>
                本版本使用 Google 帳號登入，個人紀錄在瀏覽器保留離線副本；雲端已啟用且狀態為「雲端已同步」時，才代表遠端備份完成。
              </p>
              <p>
                本機紀錄沒有加密。共用裝置的其他使用者可能透過瀏覽器資料取得紀錄，請避免在共用裝置輸入敏感資訊；跨裝置同步是否完成，請以帳號頁狀態為準。
              </p>
              <p>
                網站託管平台仍可能處理一般連線紀錄，例如 IP
                與請求網址；這不等於健身紀錄已上傳。
              </p>
              <p>
                原始紀錄與修訂會保存在本機，已同步的版本也會保存在雲端。匯出的備份檔包含健康相關資訊，請自行妥善保管。
              </p>
              <p>
                雲端資料按 Google 使用者 ID 套用 RLS 隔離。若顯示離線、尚未啟用或衝突，請勿將登入視為已備份。
              </p>
            </div>
          </Card>
        ) : path === "settings/data" ? (
          <>
            <CloudSyncPanel />
            <DataTools notify={notify} />
            <Card title="匯出與備份" icon={Download}>
              <p className="muted">
                包含個人設定、飲食、飲水、體重、訓練、計畫版本與操作歷史。換裝置前先保留一份。
              </p>
              <div className="form-actions">
                <button className="button" onClick={() => download()}>
                  匯出 JSON 備份
                  <Download size={14} />
                </button>
                <button
                  className="button secondary"
                  onClick={() => download(true)}
                >
                  匯出原始儲存資料
                </button>
              </div>
            </Card>
            <Card title="清除這個瀏覽器的資料" icon={Trash2}>
              <p className="muted">
                這只清除此裝置的本機副本，不刪除雲端帳號與雲端備份。若已有雲端版本，下次連線仍會重新下載。請先匯出備份。
              </p>
              <div className="form-actions">
                <button
                  className="button danger"
                  onClick={() => {
                    if (
                      window.confirm(
                        "已匯出備份嗎？確定清除這個瀏覽器內的 James Fitness 副本？雲端紀錄不受影響。",
                      ) &&
                      window.confirm(
                        "第二次確認：本機副本將暫時清空；若已同步至雲端，下次連線可能重新下載。確定繼續？",
                      )
                    ) {
                      reset();
                      router.push("/today");
                      notify("已清除本機副本");
                    }
                  }}
                >
                  清除本機副本
                </button>
              </div>
            </Card>
          </>
        ) : (
          <>
            <Card title="我的餐次" icon={Utensils}>
              <div className="pill-row">
                {state.mealSlots.map((s) => (
                  <span className="tag" key={s}>
                    {s}
                  </span>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = slot.trim();
                  if (!name) return;
                  if (
                    save("新增餐次", (s) => {
                      if (s.mealSlots.includes(name)) throw Error("餐次已存在");
                      s.mealSlots.push(name);
                    })
                  ) {
                    setSlot("");
                    notify();
                  }
                }}
              >
                <div className="form-actions">
                  <Field label="新增餐次">
                    <input
                      value={slot}
                      maxLength={20}
                      onChange={(e) => setSlot(e.target.value)}
                      placeholder="例如：午加餐"
                      required
                    />
                  </Field>
                  <button className="button secondary">
                    新增
                    <Plus size={13} />
                  </button>
                </div>
              </form>
            </Card>
            <Card title="飲水目標" icon={Droplet}>
              {state.profile ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const target = Number(
                      new FormData(e.currentTarget).get("target"),
                    );
                    if (
                      save("更新飲水目標", (s) => {
                        s.profile!.waterTarget = target;
                      })
                    )
                      notify();
                  }}
                >
                  <NumberField
                    label="每日 ml（0 代表未設定）"
                    name="target"
                    value={state.profile.waterTarget}
                    step="50"
                  />
                  <div className="form-actions">
                    <button className="button secondary">保存目標</button>
                  </div>
                </form>
              ) : (
                <Link className="text-link" href="/onboarding">
                  先建立個人資料 →
                </Link>
              )}
            </Card>
            <Card title="目前環境" icon={Info}>
              <p>本機資料版 · v0.4.0</p>
              <p className="muted" style={{ marginTop: 10 }}>
                時區 Asia/Taipei · kg / g / ml
                <br />
                GitHub Pages 可提供網站，但目前不提供雲端資料同步。
              </p>
              <div className="form-actions">
                <Link className="button secondary" href="/data">
                  資料管理
                  <ArrowRight size={14} />
                </Link>
              </div>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
