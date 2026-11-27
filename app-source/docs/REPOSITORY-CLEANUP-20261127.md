# JFS 2.0 — Repository Cleanup / 2026-11-27

狀態：**Draft PR #70 的程式與舊版資產整理，尚未合併、尚未部署、未動正式資料庫。**

## 清理基準

- 原始分支 `redesign/jfs-2-20261119`，清理前 commit `0a473169932345d21964a64227d0660701190f7a`。
- 清理前自動化檢查：14/14 GitHub CI 成功；154/154 單元測試，78/78 靜態建置；Chromium 68 通過、17 項依模式跳過。
- 唯一正式介面規範：`JFS-2-FINAL-DIRECTION.md`，唯一樣式入口：`src/styles/index.css`。
- 此清理只改工作樹；Git 歷史仍有原檔，可回復。

## 已確認為過時、不在正式原始碼或建置依賴中的資產

| 位置 | 理由 | 本次處置 |
| --- | --- | --- |
| `pr-preview/pr-62/` | PR #62 歷史**編譯輸出**（427 檔、6,226,462 位元組）；不是 `app-source/` 的建置來源，也不由目前發布 workflow 上傳 | 自 Draft 分支移除；Git 歷史保留 |
| `ui-preview/` | 兩檔獨立舊 Cinematic 2077 原型，README 自述與正式 App／帳戶資料隔離 | 自 Draft 分支移除；Git 歷史保留 |
| 過時設計文件（Glass 4、Monochrome、Visual Styles/System、Design System 3、DS3 Showcase、Minimal UI Audit） | 視覺方向已被 Premium Light 最終規範取代；不是執行時程式 | 自 Draft 分支移除；Git 歷史保留 |

舊預覽若有外部保存的直接連結，在未來網站重新發布後可能無法使用；這些連結不再是正式產品介面。

## 刻意保留：不能當成「垃圾」刪除

- `app-source/src/`、五份正式 CSS、`app-source/src/content/`：所有目前被編譯引用的功能與資源。
- `app-source/src/lib/guest-mode.ts`、`legacy-route.tsx`、`auth-pages.tsx`、`appearance.tsx`：舊連結／偏好／資料的相容路徑，**不代表舊視覺仍可選擇**。
- `app-source/supabase/`、`app-source/tests/`、`app-source/docs/evidence/`、`native-poc/`、`branch-history.json`：資料安全、隔離驗證、歷史與回歸證據。
- 根目錄歷史 Pages 輸出與 `.pages-files.json`：發布前暫保留；`app-source/scripts/prepare-pages.mjs` 可能讀取該清單並更新 root，不能任意砍除。
- 使用者 LocalStorage、IndexedDB、雲端快照、JSON 備份及所有營養／訓練歷史：**完全不在本次刪除範圍**。

## 防止舊輸出再次進入 Git

- 新增 root `.gitignore` 忽略 `pr-preview/` 與 `ui-preview/`。
- `app-source/.gitignore` 忽略 `review-kit/`、`test-output/`；保留原本 `.next/`、`out/`、`node_modules/` 等。
- 現有根目錄舊靜態產物是已追蹤檔案，本次不做刪除或強行遷移。

## 再驗收與發布

提交後，必須檢查 GitHub CI 14 項全部完成且通過，並核對 PR 仍為 Draft、沒有正式部署。完整的真實 Google OAuth、Supabase Staging 雙帳戶與雙裝置、iPhone Safari 實機以及 Figma 最終核准仍屬發布前阻擋條件；不得用程式清理或 CI 全綠取代。

## CI Runner 套件來源故障與隔離修正

- 第一次清理後檢查中，GitHub `ubuntu-latest` Runner 的外部 Microsoft APT 套件來源回應 403，造成隔離 Postgres 作業在安裝 `postgresql-client` 時失敗，**與資料庫 schema／使用者紀錄無關**。
- 改由既有 `postgres:16` CI service container 內建的 `psql` 經 `docker exec` 執行相同 SQL 檔與負面權限測試；避免安裝主機套件，保留 `ON_ERROR_STOP=1` 與獨立資料庫。
- 這只更動測試 workflow，沒有修改 SQL migration、帳戶紀錄或正式 Supabase。新一輪 CI 結果仍須以 GitHub check-runs 為準。
