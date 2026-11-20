# 第一輪介面清理與回歸紀錄

範圍為 Draft PR #70，基準提交 `2042804`。下列尺寸以未壓縮檔案位元組計，建置數字來自前後兩個隔離 Review 匯出版本。

| 指標 | Phase 3 | 本輪 |
|---|---:|---:|
| src 檔案數 / bytes |118 / 2,010,359|99 / 1,414,572|
| CSS 原始檔數 / bytes |25 / 577,922|5 / 52,920|
| 匯出 CSS 檔數 / bytes |7 / 539,807|1 / 42,524|
| public 檔案數 / bytes |5 / 982,511|3 / 16,508|
| 測試檔案數 / bytes |54 / 249,128|50 / 210,711|
| 匯出檔案數 / bytes |435 / 6,151,551|421 / 4,233,092|
| lockfile 套件數，扣除根項目 |269|204|
| fitness-app.tsx 行數 |2,503|332|
| 單元案例通過 |146|147|

## 移除與接替

- 逐一核對根版面載入、元件呼叫點與靜態資產路徑。Today 主路由使用 Focused Dashboard，舊 Today、城市背景、角色模型、裝備裝飾及其專屬素材已移除。Three.js、React Three Fiber 與型別套件一併退出依賴。沒有 Tailwind 指令或 utility 的使用點，移除其編譯外掛、設定與依賴。
- 根版面只引入 `src/styles/index.css`。明暗色票由 `tokens.css` 定義，版面、工作區與共用介面規則分檔。保留手機／桌面導覽、Logger 的視窗高度、Rest Dock 與鍵盤避讓所需排版。暖白與 Emerald 為可替換的過渡色票。
- 外觀頁提供 Light、Dark、System。舊 Companion 深連結通往外觀設定。使用相同驗證器和儲存格式，只在使用者儲存時更新明暗欄位。移除舊視覺展示路由，舊技術文件增加歷史標記。
- Profile、營養計畫、Cardio、Progress、資料設定由原本的頁面元件抽至 features。共用 Sheet、控制項與頁面結構集中於 components/ui。沿用既有資料存取、Session/Cycle 計算及帳戶流程。
- 淘汰驗證固定黑底、玻璃模糊與 Showcase 材質的測試。保留營養總量／RWD 案例，更新選擇器及 WebKit 測試清單。舊 Monochrome 工作流程改為隔離資料的十項核心回歸。Pages 工作流程只更新測試檔名。

## GitHub 與發布路徑

六個遠端分支都保留。main 和目前開發分支繼續使用，fix/release-audit 有開啟的 PR #66。三個清理候選分別是已合併的 #67（skinless thigh）、#68（Nutrition UX）、#69（Nutrition release）。外部預覽或第三方對分支名稱的引用尚無完整清冊，本輪未刪分支。

人工確認正式 Pages 從 app-source/out 上傳。根目錄靜態檔、pr-preview、舊 QA 證據及 .pages-files.json 保留。舊的 prepare-pages 腳本仍讀取該清單並會重寫部分根目錄，本輪未執行。刪除舊匯出前，仍需釐清外部 deep link、預覽引用及歷史版本保留需求。

## 驗證範圍

| 項目 | 結果 | 證據 |
|---|---|---|
| TypeScript、Unit、靜態建置 | Passed | typecheck 無錯誤，147/147；Review 匯出 78/78，移除 1 個開發展示頁。另測一般建置。 |
| 核心 Browser E2E | Passed，受控 Chromium | 真實瀏覽器透過 localhost 操作三組共 10 案例。涵蓋跨日額外訓練、Rest、RP／Drop、保存失敗重試、日期與焦點、第二場、課表拖曳與版本、Calendar、Batch Plate。詳見 tests/e2e 的 phase-two-review、phase-two-integrity、phase-three。 |
| 舊資料相容 | Passed | 9 組明暗模式與舊風格欄位的序列化測試。瀏覽器另載入含 cinematic 和 showCompanion=true 的虛構帳戶，由 /settings/companion/ 修改明暗及重新載入，原有 Sessions、Cycles、Meals、Versions 與舊選項比對一致。 |
| 視覺回歸 | Passed，指定範圍 | Today、Journal、Training、Insights 各驗證 390×844、1440×900。8 個頁面均無整頁水平溢出，導覽依寬度切換。附清理前後畫面，前版桌面為 1120×800，縮圖供版面比較。 |
| npm audit | Passed | Next 16.4.3 的 audit 回報直接依賴 moderate、含 7 則公告。更新至 16.4.6，使用新鎖檔複查回報 0。此數字僅涵蓋當次套件公告。 |
| 標準 Playwright CLI | Blocked | macOS 拒絕 Chromium 的 MachPortRendezvous 註冊，CLI 未進入頁面操作；本機 HTTP 與受控 Chromium 可用。 |
| 完整 GitHub CI、WebKit、iPhone 實機、真實 OAuth | Not Run（本機報告） | 各自需要對應 runner、硬體或測試帳號；需核對 PR 最新 checks。 |

[手機前後截圖](cleanup-evidence/mobile.webp) · [桌面前後截圖](cleanup-evidence/desktop.webp)

首次測試發現長列拖曳落點捲到固定導覽下方。測試改用桌面指標操作，將把手捲至可見範圍並放到前一列內，再驗證實際新版本的動作與既有快照。測試期間有個別導航等待逾時，獨立重跑通過，CLI 與真機穩定性仍待複查。

## GitHub Actions 複驗

提交 cb0e0f3 的標準 Chromium runner 已實際跑完核心套件，10/10 Passed。一般 UI build／unit、原生 bundle、離線 lab 及 PostgreSQL 協定檢查也已通過。另有工作流程失敗，包含 Food Logger 的舊黑白按鈕斷言、Preview 測試使用舊標籤與舊儲存鍵，以及全套 E2E 收集時找不到 IndexedDB 測試套件。後續修正改驗按鈕對比、使用現行 Journal／Insights 與餐次操作，並在測試載入時以已鎖定的 esbuild 直接編譯虛構測試 fixture。可在乾淨目錄收集 83 個瀏覽器案例；完整結果以 PR checks 為準。

## 重跑與剩餘工作

於 app-source 安裝鎖定依賴後執行以下命令，使用獨立瀏覽器設定檔。測試資料由 Review 版本產生。

~~~sh
npm ci
npm run typecheck
npm test
NEXT_PUBLIC_JFS_REVIEW_PREVIEW=1 NEXT_PUBLIC_JFS_REVIEW_ID=phase3 npm run build
npx playwright install chromium
NEXT_PUBLIC_JFS_REVIEW_PREVIEW=1 NEXT_PUBLIC_JFS_REVIEW_ID=phase3 npx playwright test tests/e2e/phase-two-review.spec.ts tests/e2e/phase-two-integrity.spec.js tests/e2e/phase-three.spec.js --workers=1
~~~

發版判定 **No-Go**。下輪可按工作區繼續收斂歷史排版選擇器、將 daily 與 training-flow 的共享表單／資料依賴拆開，並補驗次要路由、深色全站長內容、iPhone Safari／鍵盤與 OAuth 測試帳戶。Figma 最終品牌及逐頁設計驗收另行進行。
