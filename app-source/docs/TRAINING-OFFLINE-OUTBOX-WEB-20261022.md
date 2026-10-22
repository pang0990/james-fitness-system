# JFS｜Training Offline-first · Web IndexedDB Outbox Batch 3

**日期**：2026-10-22。**性質**：獨立開發 Draft，不是正式資料遷移、雲端同步或 Native App 上線。

## 已實作內容

- `src/lib/training-offline/protocol.ts`：平台無關的 Session snapshot + Outbox 雙寫交易協議、固定 command UUID、同 Session 序號與期望的 server revision。
- `src/lib/training-offline/indexeddb-adapter.ts`：Web `IndexedDB` 獨立資料庫 `jfs-training-outbox-dev-v1`，`sessions` + `commands` 在**單筆 IndexedDB transaction** 原子寫入。鍵是 `[ownerId, sessionId]` 和 `[ownerId, commandId]`。
- `src/lib/training-offline/memory-adapter.ts`：可測試的原子交易記憶體版本，失敗不提交任何部分修改。
- `serverSessionProjection`：本機 `SetDraft` 和 `cycleCounted` 不會上傳到目前開發版 RPC。**伺服器 Cycle 權威流程仍未完成**。
- `readyTrainingCommands`：每個 Session 只選擇最舊一筆待同步指令，防止離線多次修改時的 revision 亂序。
- `acknowledgeTrainingCommand`：只接受對應 commandId/sessionId 和 revision 的 Server Receipt；把確認與移出 Outbox 一起提交，不覆寫更晚的本機 Session。
- `markTrainingCommandFailed`：暫時網路錯誤保留相同 command UUID 並採漸進延遲重試；40001 版本衝突、22023 驗證錯誤及 42501 權限錯誤停用自動重試，保留指令供人工安全調解。
- `flushReadyTrainingCommands`：注入經驗證的 account 身分與 sender，網路動作**永遠在 IDB transaction 外**，登出或切換帳號時不得將舊回應確認到新使用者的佇列。

## 備份與現有 Web 的隔離

**此批不會自動執行或接管目前的 Training 3.0。** `StoreProvider` 原本的 `james-fitness-user-v1:<accountId>` JSON snapshot 完全不變；沒有將真實資料匯入 IndexedDB、沒有上傳任何 Session，也不會自動登入 Dev Supabase。這是刻意的相容性和資料安全界線。

此階段僅建立 Web 端 Adapter 的初始可驗收版本。下批才可在專用**開發帳戶**下，使用已確認的資料庫／RPC 做端到端同步；需要資料遷移前，還要原裝置 JSON 原始副本、immutable staging、重複 ID 和跨版本測試及可回退方案。

## 自動驗收

- Node 記憶體 adapter unit：原子成功與失敗回滾、固定 UUID 防重複、offline 多次修改 revision 順序、server receipt 嚴格核對、指數退避、衝突保留、登出 fence、跨帳戶隔離與壞 Session 拒絕。
- Playwright Chromium 真實瀏覽器 IndexedDB：兩個 object store 同交易、重新載入後資料仍在、ack 一起提交、手動 throw 後交易 abort、A/B 帳戶隔離和 conflict 狀態保留。
- CI `jfs-training-sync-dev-db.yml` 同時保留 PostgreSQL 16 的 RLS／RPC 負向測試、Web Typecheck、Unit、Static Build。
- Chrome IndexedDB 原子性測試**不能**等同 Android 原生 Expo SQLite 或 iOS Safari 的真機驗收。

## 下批（仍未完成）

1. **Dev Supabase Project**：須是獨立於現有 OAuth 正式 Project 的新專案；用真正 JWT 和 PostgREST 負向驗收，不能把 CI stub 當作線上 Supabase。
2. **伺服器 Sync API**：完整 Session/Set/Cycle 語義、分頁 change-feed、伺服器權威 Cycle 完成指令、回溯版本與資料清除政策。
3. **Web 離線持續訓練整合**：在取得真正可回退且不破壞舊紀錄的遷移策略後，選定帳戶明確 opt-in，再逐段接到 StoreProvider。現在尚未啟用。
4. **Native SQLite**：在 Expo dev workspace 上實作同一 transaction/outbox 協議，驗證 Hermes/Metro 和 SQLite crash/restart 後的原子性。
5. **三端 PoC**：同帳戶、多設備同時編輯、失敗重試、衝突處理和 logout 資料隔離；最後才大量製作 Native UI。

**測試結果只能以最新 Draft PR CI 為準。正式 main、現有 Google 登入、正式 Supabase 都維持原狀。**
