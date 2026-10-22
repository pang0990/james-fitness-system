"use client";

import { useEffect, useMemo, useState } from "react";
import { REVIEW_PREVIEW, REVIEW_USER_ID } from "@/lib/review-preview";
import { WebIndexedDbTrainingDatabase } from "@/lib/training-offline/indexeddb-adapter";
import {
  saveTrainingOffline, readyTrainingCommands,
} from "@/lib/training-offline/protocol";
import { appendWorkoutSet } from "@/lib/training-core/workout-sets";
import type { Session } from "@/lib/training-core/types";

const SESSION = "jfs-synthetic-offline-lab-session";
const enabled = REVIEW_PREVIEW &&
  process.env.NEXT_PUBLIC_JFS_OFFLINE_DEV_LAB === "1";

export function OfflineTrainingLab() {
  const database = useMemo(() => new WebIndexedDbTrainingDatabase(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [pending, setPending] = useState(0);
  const [message, setMessage] = useState("尚未寫入虛構訓練");

  const refresh = async () => {
    const view = await database.transact(async tx => ({
      session: (await tx.getSnapshot(REVIEW_USER_ID, SESSION))?.payload ?? null,
      commands: await tx.listCommands(REVIEW_USER_ID),
    }));
    setSession(view.session);
    setPending(view.commands.length);
    setMessage("讀取 IndexedDB 完成；沒有啟用任何雲端同步");
  };

  useEffect(() => {
    if (!enabled) return;
    void refresh().catch(error => setMessage(String(error)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [database]);

  const addSet = async () => {
    try {
      const now=new Date().toISOString();
      const updated = session ? structuredClone(session) : {
        id:SESSION,date:now.slice(0,10),name:"虛構離線訓練",status:"in_progress" as const,
        createdAt:now,exercises:[{id:"example-row",name:"Barbell Row",sets:[]}],
      };
      appendWorkoutSet(updated,"example-row",{
        id:crypto.randomUUID(),weight:60,reps:8,type:"working",createdAt:now,
      });
      await saveTrainingOffline(database,{
        ownerId:REVIEW_USER_ID,commandId:crypto.randomUUID(),
        session:updated,now,
      });
      await refresh();
    } catch(error) {setMessage(error instanceof Error?error.message:"儲存失敗");}
  };

  if (!enabled) {
    return <main style={{padding:24}}>
      <h1>Offline Training Lab 不可用</h1>
      <p>只能在隔離測試資料模式使用。</p>
    </main>;
  }
  return <main style={{minHeight:"100dvh",background:"#09090b",color:"#fff",
    padding:"36px max(24px,env(safe-area-inset-left)) 140px"}}>
    <h1>Training / Offline Lab</h1>
    <p>DEV ONLY · 虛構帳戶 · 不讀取或更動正式 JFS 訓練紀錄</p>
    <section aria-label="本機訓練狀態" style={{padding:24,border:"1px solid #444",
      borderRadius:16,maxWidth:600,marginTop:24,marginBottom:24}}>
      <h2>{session?.name ?? "尚無訓練"}</h2>
      <p data-testid="offline-lab-sets">組次：{session?.exercises[0]?.sets.length ?? 0}</p>
      <p data-testid="offline-lab-pending">待同步指令：{pending}</p>
      <p data-testid="offline-lab-status">{message}</p>
    </section>
    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      <button type="button" onClick={()=>void addSet()}
        style={{padding:14,borderRadius:10}}>新增示範組次（本機儲存）</button>
      <button type="button" onClick={()=>void refresh()}
        style={{padding:14,borderRadius:10}}>重新讀取 IndexedDB</button>
    </div>
    <p style={{marginTop:28,maxWidth:610,lineHeight:1.7,color:"#aaa"}}>
      不提供真實帳戶登入、資料匯入或網路同步。本畫面用實際 Training Core 組次記錄邏輯，
      驗證同一筆本機 Session 和待同步指令在重整後仍可恢復。
      正式 Training 3.0 尚未切換為 IndexedDB，需完成備份與安全遷移驗收。
    </p>
  </main>;
}
