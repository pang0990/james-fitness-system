# James Fitness System｜2026-10-19 審核與分支升級紀錄

> 範圍：使用者提供的 7 張 iPhone 實際截圖、`main` 版本的程式碼、靜態網站及 GitHub Actions 紀錄。**本文件不是已完成的實機端到端驗收**。
> 原則：不得破壞原資料、擅改健身處方公式、在正式 DB 直接執行破壞性 migration、或未經授權將分支合併／部署。

## 可查證的既有實作

- Next.js 16 App Router、React 19、TypeScript、PWA、Playwright E2E 測試檔。
- 使用 Supabase Auth Google OAuth + PKCE；個人健身資料仍在瀏覽器 `localStorage`，依 Google user ID 分鍵；現階段沒有跨裝置健身資料同步。
- Today、Nutrition、Training、Progress 主要頁面、JSON/CSV 匯出、備份還原、訓練歷史及規則版本。
- Minimal／2077 Cinematic 兩套主題；目前 Modern Minimal 大量採用藍色，與黑白金正式品牌方向不同。
- CI 的 `npm ci`、`typecheck`、`npm test`、`build` 已有近期成功紀錄，**但 CI 沒有跑 Playwright E2E**。

## 螢幕截圖觀察（尚待在可互動瀏覽器重測）

1. Today「繼續訓練」在 Action Queue、訓練卡片兩度成為大型主行動，重要性重複。
2. Today、Nutrition、Progress 的空資料狀態佔很大面積；需縮小並提供明確的下一步。
3. 手機版底部分頁與 Safari 工具列共用狹窄空間，須驗證最後一筆內容可捲動至完全可操作。
4. Nutrition 熱量環及 3 個巨量營養素環在無目標時佔用大量空間。
5. Training 顯示「額外訓練」時另呈「先建立自己的訓練計畫」，需釐清是正確區別兩種計畫或文案矛盾。
6. Progress 無體重紀錄時圖表高度及空白偏多；需保留「資料不足不亂猜」原則。
7. 藍色按鈕／圖示與既定石墨黑、白、香檳金品牌規範不一致。

## P0：安全與資料完整性

| ID | 事實／風險 | 修改方案 | 影響 | 驗收 |
|---|---|---|---|---|
| P0-01 | Service Worker 原先快取所有站內成功 GET，含可能的 OAuth callback URL | 排除 auth 路徑和認證查詢參數；新增產生式 SW 測試 | PWA/Auth | 驗證 code、token 查詢網址不被攔截，正常頁面仍被攔截 |
| P0-02 | 現有資料為 per-user localStorage，缺乏雲端自動備援 | 建立零覆寫備份、驗證、資料版本遷移及回滾流程 | 全站/資料 | 實際測試 JSON 還原與版本相容，匯入前後資料可核對 |
| P0-03 | 既有 Numbers CUT 規則與後續討論的日型比例/蛋白質設定不同，熱量下限尚未全面核定 | 建立規則差異表、歷史計畫版本相容測試，取得核定後才改計算 | Nutrition/Onboarding | 規則版控、邊界值與安全門檻通過；不得暗改既有計畫 |
| P0-04 | 尚無雲端個人表 migration/RLS 可實測 | 待 Supabase 正式測試環境就緒才測 owner_id/RLS | DB/Auth | A/B 使用者交叉讀寫被拒絕、資料移轉可逆；**未測不視為通過** |
| P0-05 | main 未受分支保護，push main 自動重建並部署 GitHub Pages | 僅 feature branch + Draft PR；正式化前設保護規則、核准發布 | CI/發布 | 不經同意不合併/部署；CI 綠燈不等於視覺及端到端已完成 |

## P1：介面、可靠性與測試

| ID | 問題 | 修改方案 | 影響 | 驗收 |
|---|---|---|---|---|
| P1-01 | Minimal 主視覺藍色與品牌不一致 | 加一層嚴格 Minimal-scoped Design System 2.0，不碰 Cinematic | 全站視覺 | iPhone、桌面深淺模式對比與操作狀態合格 |
| P1-02 | Today 重複訓練 CTA | Action Queue 保留整列 link，Minimal 改為導覽箭頭；主 CTA 留於訓練卡 | Today | 兩入口仍可用，不再有雙重大主按鈕 |
| P1-03 | Progress 缺資料大面積空白 | Minimal 沒有足夠資料時顯示可前往體重紀錄的精簡空狀態 | Progress | 沒有偽造圖表，操作直接可達 |
| P1-04 | Nutrition 熱量圓環手機過大 | 限縮手機尺寸，保留原熱量數字及目標 | Nutrition | 390px 與窄螢幕可讀且無橫向捲動 |
| P1-05 | 多數 E2E 仍為無登入時期寫法 | 建測試登入 fixture、更新案例、加入瀏覽器 CI | 測試/全站 | Google 登入/登出、記錄/備份、四頁 mobile/desktop 跑完 |
| P1-06 | 大型元件、13 個 CSS 原檔交疊 | 逐步抽 Design Tokens 和共用元件 | 架構/效能 | 每個拆分有回歸測試、效能預算不退步 |

## P2–P3：後續（此次不實作）

- P2：正式 Premium 黑甲 Companion GLB/六狀態、動態回饋、正式食譜攝影和步驟視覺、精緻圖表動畫；需有低效能 fallback 及 reduce-motion。
- P3：Production Supabase PostgreSQL/Auth/RLS/Storage/同步、備份/監控、iOS 原生容器/HealthKit/通知；開始前需確認規格與架構，不可直接移轉正式使用者資料。

## 本分支第一批修改

- `scripts/build-pwa.mjs`: Service Worker 避開認證 URL。
- `tests/pwa-security.test.ts`: 不依賴真實網路、產生 Service Worker 並測試 URL 排除。
- `src/app/design-system-v2.css`：Minimal 第一階段 tokens、主按鈕、分頁導覽、空狀態與手機營養圓環尺寸；原主題可隨時移除新匯入而還原。
- `src/components/today-reference.tsx`：Action Queue 移除 Minimal 重複大型訓練 CTA，但保留整列導航。
- `src/components/progress-direction.tsx`：無足夠體重資料時提供下一步，不製造趨勢數據。
- `src/components/training-flow.tsx`：有進行中的額外訓練、但尚無正式訓練計畫時，文案明確區分當前 Session 與未來課表。
- `playwright.config.ts`：Browser QA 改用靜態匯出來測真正部署檔（CI 使用先前建置結果）。
- `tests/e2e/auth-guest.spec.ts`：390px 與 1440px 未登入路由、HTTP 200 與 callback 錯誤處理。
- `tests/e2e/mock-auth-workspaces.spec.ts`：只用測試 fixture 模擬登入狀態，驗證主要頁面和 localStorage 飲水持續性；**不等同真實 OAuth/RLS 驗證**。

## 尚未驗證（不得標示完成）

- 缺少在本環境啟動應用及 Playwright 互動的可執行完整工作目錄；CI 需以 Draft PR 驗證 typecheck/unit/build。
- Google OAuth 實際供應商跳轉、iOS Safari Back/Forward、localStorage 資料備份/還原、RLS、真實 iPhone 操作和深淺色截圖仍未驗收。
- CSS 視覺改動屬初稿，待視覺回歸截圖核對及使用者確認才可合併。
