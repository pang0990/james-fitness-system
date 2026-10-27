# James Fitness System

本 Repository 以 **main 為唯一開發主線**。網站原始碼以 PR #63 為基礎，包含 #62 訓練功能，並整合獨立的離線同步與 Expo PoC。整理日期：2026-10-27。

網站以 `app-source/` 建置並經 GitHub Actions 手動發布。根目錄舊靜態成品保留作歷史參考；正式線上版本以網站 `release.json` 的 SHA 與成功的 Pages deployment 為準。推送 main 不會自動部署。

## 程式位置

- `app-source/`：Next.js 16.4 / React 19 / TypeScript Web App。
- `app-source/src/lib/training-core/`：共用訓練規則與 Cycle 狀態轉移。
- `app-source/src/lib/training-offline/`：IndexedDB、SQLite Adapter、Outbox 與同步協定。
- `app-source/supabase/`：隔離開發資料庫 Migration 與 RLS / RPC 測試；未套用正式環境。
- `native-poc/`：Expo iOS / Android 概念驗證；不是已發布原生 App。
- `branch-history.json`：原 66 個分支的名稱、SHA 與整理處置。舊版歷史可由 main 的 Git 歷史取回。

## 目前功能與界線

Web 包含 Today、Nutrition、Training、Progress、Settings、Knowledge；#63 的訪客入口與 Google 登入並存。正式 Web 紀錄仍使用帳戶／訪客隔離的本機儲存，登入不等於雲端備份。

Training 包含 Active Workout 草稿、組次編修／撤銷、休息與暫停、Cycle、日曆、訓練表現、恢復證據與 Cardio。離線 Outbox、開發資料庫及 Native PoC 已保留，但尚未接成正式三平台同步。

較舊的 `codex/v0.4-platform-content` 雲端密碼登入、整份狀態同步與 Capacitor 路線保存在 Git 歷史，未與目前 Google / Expo 路線同時啟用。舊視覺替代方案亦保留歷史，不覆蓋 #63。

## 本機驗證

```sh
cd app-source
npm ci
npm run typecheck
npm test
npm run build
npm run test:e2e -- --workers=1
```

原生與資料庫驗證方式見 `native-poc/README.md`、`app-source/docs/THREE-PLATFORM-SYNC-POC-20261022.md`。真實 OAuth、正式雲端同步及真機驗收仍需獨立完成。

## 發布與維護

GitHub Pages 現有網站：https://pang0990.github.io/james-fitness-system/

`publish-jfs-pages.yml` 只接受 main 上的手動 `confirm_release=true`。流程執行套件安全檢查、TypeScript、單元測試與 Nutrition/Guest 操作測試，再以 `/james-fitness-system` base path 建置、移除開發頁、上傳 Pages artifact 並部署。正式發布需等待 deploy 成功，再核對線上 `release.json`；合併或建置成功本身不等於已發布。

不要把舊 PR 描述中的測試數量當成整合後的測試結果。不要直接執行舊雲端 Migration，或以舊版資料格式覆寫目前帳戶資料。

## 整理時驗證（2026-10-27）

- TypeScript：通過。
- Domain / SQLite / Offline protocol 單元測試：132/132 通過。
- Next.js 靜態建置：通過；首次建置因依賴安全提示中止，原樣重跑成功。
- 全庫 Chromium：104 通過、3 失敗、6 依模式跳過；原樣重跑失敗項目後 2 通過、1 仍失敗。不是全綠。
- 未解：1024px 四工作區測試停在「正在確認帳號」。另外兩項逾時重跑通過，保留首次失敗證據。
- Review Preview / Offline Lab 專用測試在一般建置中跳過，未算作通過。
- Nutrition Batch 1 發布準備：Next.js 更新至 16.4.3、Zod 至 4.6.6；重新執行套件安全檢查與回歸測試。
- 真實 OAuth、Supabase DEV 整合與 iOS/Android 真機未完成本次驗收；不可將本機保存視為雲端同步。
