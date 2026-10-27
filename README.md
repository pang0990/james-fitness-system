# James Fitness System

本 Repository 以 **main 為唯一開發主線**。網站原始碼以 PR #63 為基礎，包含 #62 訓練功能，並整合獨立的離線同步與 Expo PoC。整理日期：2026-10-27。

**目前未發布新版網站。** main 的原始碼與既有 GitHub Pages 靜態成品是不同版本；根目錄已發布檔案保留。自動發布已暫停，後續部署需要另行授權。

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

單一 main 整理期間，Pages 改為 Actions 發布模式，沒有自動部署工作。`publish-jfs-pages.yml` 僅能在明確手動確認後更新根目錄建置檔案；它不是部署授權，也不會自動發布 Pages。正式發布需另外建立／確認發布流程並取得授權。

不要把舊 PR 描述中的測試數量當成整合後的測試結果。不要直接執行舊雲端 Migration，或以舊版資料格式覆寫目前帳戶資料。
