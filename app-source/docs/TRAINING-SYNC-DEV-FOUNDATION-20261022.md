# James Fitness System — Training Sync / Cloud Foundation Batch 2

**日期：** 2026-10-22
**範圍：** 隔離 Supabase 開發環境的初版 Session 投影與可靠寫入協議
**狀態：** SQL migration + CI disposable PostgreSQL 實測，**不代表已建立任何 Supabase 專案、執行線上 migration 或完成 Web/Native Sync**。

## 與現有系統的關係

- Web V3 Release PR #51 與底部空白 PR #53 都保留在 Draft，正式 main 未改。
- Shared Training Core 第一批/ Cycle 抽取在 PR #47、#52。
- 本批只新增 `app-source/supabase` 開發專用 migration、SQL 負向測試和 CI，**不改既有 Next.js 的登入與 localStorage**。
- **不要**把 Web 既有 `NEXT_PUBLIC_SUPABASE_URL`（原正式 OAuth 專案）當作開發資料庫地址；應使用一個真正獨立的新 Supabase Project，不複用其 production Auth users 或資料。
- **不要**傳送或提交 Service Role、資料庫密碼或 OAuth Client Secret 到 GitHub、聊天或網頁。

## DB 初版的安全邊界

`jfs_training_dev` 是不直接暴露給 PostgREST 的私有 schema：

1. `session_projection`：`(owner_id, session_id)` 複合主鍵，JSONB Session 投影與遞增版本；`owner_id` 只能由 Auth JWT 身分推導。
2. `command_ledger`：`(owner_id, command_id)` 主鍵，保留每筆指令的完整 canonical JSON 請求和成功回應，確保 retry 不會重複更新。
3. 兩個表皆啟用並強制 RLS，政策使用 `(select auth.uid())`；`anon`、`authenticated` 沒有直接表／私有 schema 權限，僅限受限制的 `public.jfs_dev_apply_session_v1` RPC。
4. RPC 固定 `search_path = ''`，檢查已驗證身分、Session ID、JSON 大小、基本欄位、完成狀態及 `expected_revision`，以 **transaction-scoped account advisory lock** 序列化同一帳戶寫入。
5. 相同 `command_id` 且輸入完全相同 → 回傳原結果（不重複入帳）；相同 ID 但輸入不同 → `22023`；版本衝突 → `40001`。任何中途 SQL 異常使投影＋Ledger 整筆交易回滾。
6. 初版**不接受** `setDrafts`（留在裝置本地）、也不讓客戶端寫入 `cycleCounted=true`；已完成／已捨棄的 Session 是唯讀終態。完整 Cycle 進度必須由**後續伺服器權威交易**處理，不能依客戶端宣稱的完成事件直接推進。
7. 此 migration 的可用性僅代表初版安全協議框架，還需要完整 JSON schema、payload 逐組驗證、資料保留／刪除政策、命令和結果分頁，以及服務端 Cycle 交易。

## 如何在**隔離開發專案**部署

0. 先完成 CI 測試；確認開發 Project ID **不是** Web 目前正式 OAuth Project ID。
1. 在 Supabase 控制台建立**獨立開發 Project**，使用獨立 DB／Auth。記錄該開發專案的 Project ID 與開發 API URL（不是密鑰）。
2. 只在開發專案以受控 migration 方式執行：
   `app-source/supabase/migrations/202610220001_training_dev_foundation.sql`
3. 不將 `jfs_training_dev` 加入 API exposed schema。兩張表只透過 authenticated RPC 訪問。
4. 建立兩個互不相干的**假帳號**，確認跨帳號隔離、重複 command、用舊版本提交的衝突、安全登出。這個 Supabase 真實 JWT 整合測試目前仍是 **NOT TESTED**。
5. 在完成 Dev Auth、RLS 後，才由客戶端開發環境（不是正式 `main`）接入，並建立 Web IndexedDB／Native SQLite 的原子 Outbox。

## CI 測試方法

工作流程 `.github/workflows/jfs-training-sync-dev-db.yml` 在 GitHub Actions 起一個臨時 PostgreSQL 16 container，**沒有正式 DB 連線字串或憑證**。

測試腳本依序：
- `bootstrap_auth_stub.sql`：只在隔離測試容器中模擬 `anon`、`authenticated` 以及 `auth.uid()`。
- `202610220001_training_dev_foundation.sql`：實際執行 migration。
- `session_rpc_isolation.sql`：檢查兩個身分的資料隔離、Client direct grant fail-closed、RLS 過濾、重送同一 Command、修改重用 ID、衝突、錯誤回滾、終態保護和 device-only drafts。
- Web `npm run typecheck`、`npm test`、`npm run build` 也要 PASS。

**關鍵限制：** Stock PostgreSQL + Auth Stub 測試≠Supabase 開發專案真實 JWT／PostgREST 測試。資料庫正式套用與三端互動必須另行驗收。

## 下一批工程

1. 伺服器權威 Cycle Day 狀態轉移與完整資料模型／回復機制。
2. 指令協議版本、變更 feed 與分頁同步，處理不同設備對同一 Session 的衝突。
3. Web IndexedDB 和 Native Expo SQLite 本地 Session + Outbox **同一交易**；斷線寫入、重試、版本修復。
4. iOS/Android 最小 Training-flow 共用核心運行驗證，最後再完整 Native UI。
5. 真實設備 OAuth／token 生命週期、資料刪除、跨帳戶登出清除與隱私驗收。

**不得在此批中宣稱已完成全平台同步、真實 Supabase Dev Project 建置、正式網站發布或 iOS/Android 測試。**
