# James Fitness System 2.0

此 Repository 使用 **`main` 作為正式程式主線**；JFS 2.0 目前位於 `redesign/jfs-2-20261119` 的 **Draft PR #70**，尚未合併或部署。正式站：[James Fitness System](https://pang0990.github.io/james-fitness-system/)。

## 唯一正式介面與程式來源

- **`app-source/`**：Next.js 16 / React 19 / TypeScript 的唯一 Web App 原始碼。
- **`app-source/src/styles/index.css`**：唯一正式 CSS 入口；按序載入 `tokens.css`、`layout.css`、`workspaces.css`、`interface.css`、`brand.css`。
- **`app-source/docs/JFS-2-FINAL-DIRECTION.md`**：唯一正式視覺與 UX 規範，Premium Health Intelligence × Premium Light × Editorial Design。
- **`/`**：公開品牌網站／Google 登入入口；`/today`、`/nutrition`（Journal）、`/training`、`/progress`（Insights）、`/settings`：主要產品工作區。
- 舊 Cinematic、2077、Glass、Black Line、Monochrome、Companion 等視覺版本已退出正式 UI。舊的 `/login`、`/signup` 只保留相容轉址。

## 使用者資料與歷史相容性

- **不刪除或重設任何使用者資料**：`AppState`、帳號專屬本機資料、舊訪客資料、訓練 Session/Cycle/History、營養紀錄、備份、匯入路徑與歷史版本都保留。
- 外觀欄位即使來自舊版，也只做**資料相容讀取**，不啟用已淘汰的樣式。
- 不因清理程式碼而修改正式 Supabase；舊資料遷移必須經使用者確認，不得靜默覆寫。
- `branch-history.json`、`app-source/docs/evidence/`、`app-source/supabase/` 與 `native-poc/` 保留以維護歷史、測試及後續技術相容性。

## 雲端同步與安全界線

`app-source/src/lib/cloud-sync.ts` 與帳號專屬快照的 SQL migration 已實作，並通過隔離 PostgreSQL 合約測試；**真實 Google OAuth 雙帳號、隔離 Supabase Staging、兩裝置同步與衝突還原尚待驗收**。瀏覽器 E2E 使用不可授權的模擬帳號，不能當作真實雲端驗收證據。

## 驗證方式

```bash
cd app-source
npm ci
npm run typecheck
npm test
npm run build
npm run test:e2e -- --workers=1
```

PR #70 在清理前的提交 `0a47316` 已完成 **14/14 CI 成功、154/154 單元測試、78/78 靜態頁面**；清理提交必須重新驗收，以當次 GitHub Check 為準。一般 E2E 對隔離實驗室案例會有設計上預期的跳過，不能把它們算成通過。

## 發布與歷史靜態產物

- 發布由 `.github/workflows/publish-jfs-pages.yml` 管理，**僅可在 `main` 手動勾選 `confirm_release=true`** 後執行；合併與 CI 全綠本身不會部署。
- 根目錄 `_next/`、歷史 HTML、`.pages-files.json` 等**舊 Pages 靜態輸出目前暫留**，避免在未完成正式發布與引用核對前破壞歷史頁面；它們不是 Web App 原始碼。
- 舊 PR #62 的 `pr-preview/pr-62/` 及舊 Cinematic 的 `ui-preview/` 已從 JFS 2.0 開發分支清除，不屬正式產品；需要時可從先前 Git commit 取回。日後發布不應重新提交這些舊輸出。
- **正式發布前還需要：** 真實 Google OAuth、隔離 Supabase 雙裝置測試、iPhone Safari 實機、最終 Figma／無障礙驗收、發布安全與資料備份核對。

參考：`app-source/docs/JFS-2-FINAL-DIRECTION.md` 與 `app-source/docs/REPOSITORY-CLEANUP-20261127.md`。
