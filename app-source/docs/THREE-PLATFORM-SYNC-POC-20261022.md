# James Fitness System｜PHASE 04 — Web / iOS / Android Sync PoC

更新日期：2026-10-22。獨立開發 Draft PR #56，基於 #55（IndexedDB + Outbox）。此階段允許**虛構測試資料**，不允許正式 JFS 帳戶資料遷移、正式 Supabase Auth 登入復用、覆蓋原網站或直接併入 main。

## 一、四條任務目前的客觀狀態

| 工作 | 目前有的可審查程式 | 尚未經驗證／阻擋 |
| --- | --- | --- |
| Supabase Dev | 前期私有 Session Schema、RLS、寫入 RPC；本 PR 新增 verified dev sender、帳戶受限 Session read RPC、兩帳號 DB 隔離 SQL，附可選真實 Dev JWT 實測腳本 | **沒有具名且已核准的獨立 Supabase Project**；沒有完成真正的 Dev Auth / PostgREST 實測 |
| Web Offline | 有原子 IndexedDB Outbox，本 PR 增加合成訓練 Set + IndexedDB Dev Lab，以及不覆蓋既有 local snapshot 的遠端匯入程序 | 未接管 Training 3.0 正式 StoreProvider；無法在原裝置備份缺失時安全遷移真實使用資料 |
| iOS/Android SQLite | 使用 Expo SQLite withExclusiveTransactionAsync 的同協議 adapter；有真實 Node SQLite 資料庫回滾／重開測試及原生 Expo SDK 57 虛構訓練 App | 尚未實機安裝、重啟驗證，未建立原生 OAuth，Expo JS bundle 不等於原生 binary/真機 |
| 三端同步 | Web → iOS → Android 的**協議模擬**，驗證同一 synthetic owner、多端並行、版本衝突不覆寫 Android 離線修改 | 無真實 Supabase Dev JWT 的三台真機同步；無權威 Cycle RPC、變更 feed 或衝突合併 UI |

## 二、如何在完全隔離的 Supabase Project 做真實 Dev JWT 驗收

**注意：這不是現存 Web Google OAuth 的正式 Project。**

1. 在 Supabase 控制台建立**另一個** Project，記錄其 *Project Ref* 和公開 API URL；確認其 ref 與目前 `src/lib/supabase-browser.ts` 使用的正式 ref 不同。
2. 確認只有 dev 專案操作權限，並在其 SQL Editor／受控 Migration Runner 依序執行：
   - `app-source/supabase/migrations/202610220001_training_dev_foundation.sql`
   - `app-source/supabase/migrations/202610220002_training_dev_read_session.sql`
3. 在這個 dev Auth 中建立兩個**合成測試帳號**，可用 Email／Password 測試登入；勿複製正式帳號或聯絡人資料。兩個帳號的密碼不能放在 repo、公開 Actions logs 或聊天室。
4. 在安全的本機 shell 設定測試程序專用變數：

   `JFS_DEV_SUPABASE_URL`、`JFS_DEV_PROJECT_REF`、`JFS_PRODUCTION_SUPABASE_URL`、`JFS_DEV_SUPABASE_PUBLISHABLE_KEY`、`JFS_DEV_TEST_A_EMAIL`、`JFS_DEV_TEST_A_PASSWORD`、`JFS_DEV_TEST_B_EMAIL`、`JFS_DEV_TEST_B_PASSWORD`、`JFS_DEV_SMOKE_ALLOW_WRITES=YES_I_CONFIRM_SYNTHETIC_DEV_ONLY`

5. 從 `app-source/` 執行：

```bash
npm ci
npx tsx scripts/verify-dev-supabase.mts
```

只有測試程序明確收到全部 dev-only 變數並且 Dev Ref 不同於 Production 時，才會登入兩個 Dev Auth 帳戶並寫入具有獨立隨機 ID 的虛構 Session。將驗證：Auth getUser、A/B Session 隔離、相同 Command 重送、伺服器 CAS 版本衝突、按帳戶下載。**此實測目前未執行，不得標 PASS**。

6. Dev Schema 是刻意不曝露 PostgREST 的私有 schema；只授權 `public` 上受控的單一寫入／單一讀取 RPC。不要加入自動同步開關到正式網站。

## 三、Web 端隔離離線訓練驗收

僅當同時設 `NEXT_PUBLIC_JFS_REVIEW_PREVIEW=1` 和 `NEXT_PUBLIC_JFS_OFFLINE_DEV_LAB=1`，Next.js 才允許使用 `/dev/offline-training/` 的互動測試入口：

```bash
cd app-source
npm ci
NEXT_PUBLIC_JFS_REVIEW_PREVIEW=1 NEXT_PUBLIC_JFS_OFFLINE_DEV_LAB=1 npm run build
npm run start
```

測試動作：開啟 `/dev/offline-training/`，新增一組示範動作，確認 Outbox + Session 都存在；刷新頁面，再增加一組；離線更新後保留在瀏覽器。CI 有相同流程的 Chromium E2E。**不可把測試版 localStorage/IndexedDB 誤當正式個人資料，也不可在同一 origin 上部署正式版**。

正式 Training 3.0 和 `StoreProvider` 仍使用原本的個別帳號 localStorage；**保護既有資料高於同步功能進度**。待真實使用者手動外部備份已確認、可逆 migration 完成、明確 opt-in 並且裝置端雙寫策略驗收後，才允許切換主訓練畫面。

## 四、原生開發與 QA

`native-poc/` 是 Expo SDK57 + React Native 測試 App，使用官方 Expo SQLite 和 Crypto，**只存虛構訓練**。詳見 `native-poc/README.md`。

- 先 `cd app-source && npm ci`，再 `cd ../native-poc && npm install`。
- 執行 `npm run typecheck`、`npm run bundle`；兩平台 JS bundling PASS 只能代表 Metro 可以處理共用代碼，不代表取得真實裝置授權、原生功能或離線 crash durability 驗證。
- 使用 iOS／Android 測試設備時，需記錄 OS、Expo Go／Development Build SDK、開啟／斷網／重啟／登入登出行為、SQLite persisted 後資料正確性。
- Native POC 的硬編碼 UUID 是**明確標示的虛構測試身分**。原生第一版正式帳戶必須改由真實 Dev Auth getUser 驗證，並保證登出後不同帳號資料隔離。

## 五、CI 驗收口徑

- `npm run typecheck`、`npm test`、`npm run build`。
- Web Chromium 完整現有測試、IndexedDB 真實持久化以及隔離 Training Set Lab 操作測試。
- PostgreSQL 16：寫入和讀取 RPC、RLS、重送及版本衝突、兩個模擬帳戶。
- Node SQLite：Session+Outbox 真實檔案、關閉重開、原子回滾、帳戶隔離。
- Expo iOS 和 Android JS bundling。
- **仍需**獨立 Supabase Dev JWT、真正 iOS/Android 裝置與三端同時在線/離線實測。即使以上 CI 全綠，也不能對這些標上 PASS。

## 六、下一個必須解決的外部前置條件

接下來需要一個**獨立 Supabase 開發 Project** 的開發環境（只分享可公開的 Project Ref/URL，不分享密碼或任何 secret key），以及可使用的 iPhone + Android 測試裝置。此批沒有連接 Supabase 帳戶管理工具，不能替使用者在雲端創建 Project 或設定第三方 OAuth，也不能宣稱已做真機驗收。

所有功能維持 Draft PR；GitHub Pages main、正式用戶 localStorage、現有 Supabase Auth 及 Production DB 均保持不變。
