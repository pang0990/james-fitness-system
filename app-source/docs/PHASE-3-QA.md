# James Fitness System 2.0 · Phase 3 驗收

2026-11-19，原 Draft PR #70。**上線判定 No-Go**。

## 網站與設計

本輪從 64cd21e 接續。使用原檔的 Light Variables 與已建立的核心 Frame，在現有 Next.js 頁面套用暖白底、深墨綠文字、Emerald 主操作、細線卡片與共用標題。新配色套用在 Minimal 淺色的核心工作區。刻意保留深色、Cinematic 選擇與既有分析工具。Review 預覽初始資料使用淺色。

Today 手機採單欄，桌面重點與營養在左、飲水與恢復在右。Journal 有營養主欄與依選定日期呈現的健康紀錄；手機健康輸入使用底部對話框，桌面使用右側面板。只有實際有排程才在 Training Home 標示今日排程；無排程的課表標示下一個待練日。歷史依 Session 分列、第二場獨立。所有名稱與數字仍由原有路由、元件和 store 提供。

Figma 原檔先前已建立 78 個 Frame、39 對畫面與六個原型入口。本輪重新開啟工作階段後，要求 Today 設計與截圖時收到 Starter 額度已滿。**Figma 六條播放、Overlay、Variants 與最新版逐像素核對均為 Blocked**。網站截圖與節點逐項對應如下。設計圖仍有未接通的健康 Overlay；網站的原生對話框已可測試。

|範圍|原始設計|截圖前綴|本輪對照|
|---|---|---|---|
|Today|[手機](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-2) · [桌面](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-40)|`today`|四區依序排列；桌面重點與營養在左，飲水與恢復在右。網站保留真實營養進度與快速飲水。|
|每日紀錄|[手機](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-560) · [桌面](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-594)|`journal`|營養摘要、有效餐次與 P/C/F、依所選日期讀取的健康紀錄。保留日期列及週檢視。|
|每日健康紀錄|[手機](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-630) · [桌面](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-659)|`health`|網站手機底部 Sheet；桌面右側 548 px。Figma Overlay 的開關、返回仍待接通。|
|Food Detail|[手機](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-856) · [桌面](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-882)|`food`|網站以午餐的搜尋結果操作，顯示基準克數與換算營養；Figma 範例使用 Recent，數值來源不同。|
|Training Home|[手機](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-80) · [桌面](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-108)|`training`|依 Session、日期排程或待練日區分標題。保留額外訓練、暖身及動作詳情。|
|Training Plan|[手機](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-1140) · [桌面](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-1170)|`plan`|週期與訓練日先呈現；現有模板和版本關係可繼續操作。|
|Focused Day Editor|[手機](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-1252) · [桌面](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-1280)|`editor`|手機開啟單日；桌面保留訓練日選擇。完整動作目標、排序與按鍵可操作。|
|Active Workout／休息|[手機](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-220) · [桌面](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-256)|`active-rest`|已提交一個工作組；保留目前動作、預填重量與底部計時 Dock。|
|Finish Review|[手機](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-344) · [桌面](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-376)|`finish`|依真實資料顯示完成數、草稿及 Cycle 決定。|
|Workout Summary|[手機](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-456) · [桌面](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-482)|`summary`|選 Keep 保存後進入摘要；顯示保存結果與歷史入口。|
|Workout History|[手機](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-1622) · [桌面](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-1648)|`history`|Session 列明日期、場次、名稱、狀態與組數。各場可獨立展開。|
|Session Detail|[手機](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-1676) · [桌面](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-1700)|`session`|讀取該場的真實組次、時長、RIR 與歷史更正入口。|
|Insights|[手機](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-1776) · [桌面](https://www.figma.com/design/9boGxEmWT2U2pY3HWQumMp/James-Fitness-System-2.0?node-id=24-1804)|`insights`|沿用現有區間、圖表與計算。在原型的趨勢摘要以外，網站仍保留原來的分析工具。|

Mac 下載包內開啟 `qa/comparison.html` 可直接閱讀 26 張原尺寸網站截圖並前往對應設計。網站尺寸為 390 × 844、1120 × 800。數值存於 `qa/measurements.json`，主要量測對象為開啟的 dialog 或首個標題，座標以當下捲動位置為準。Figma 假資料、固定 Frame 高度與網站實際資料長度不同。未以人工近似圖冒充 Figma 端截圖。

## 測試結果

|項目|狀態|證據與界線|
|---|---|---|
|TypeScript|Passed|npm run typecheck，零錯誤。|
|Unit|Passed|146/146。使用 node --import tsx --test tests/*.test.ts 執行相同檔案，避免 tsx CLI 的 IPC 權限限制。|
|隔離靜態建置|Passed|79/79 頁與 PWA 輸出；保留最終 build log。Next.js 16.4.3 建置工具另回報該版本的安全性警示，發布前須核對公告與受影響範圍、完成必要更新及回歸。|
|Chromium 經本機 HTTP|Passed|以專用瀏覽器連到 127.0.0.1 的最終建置，允許同源、阻擋其他主機。執行 10 個案例的測試本體；受控瀏覽器以等價的可見性／結果斷言執行。|
|標準 Playwright CLI 啟動 Chromium|Blocked|本機 HTTP 已可監聽；CLI 啟動 Chromium 遇到 macOS MachPortRendezvous 的 Permission denied，案例尚未進入操作。|
|資料一致性、失敗與重試|Passed|同一動作重量預填、草稿獨立、子組刪除／復原、重試及連點、Finish Review、同日第二場、版本與快照、飲食單筆及批次、選定日期健康紀錄。|
|Phase 3 新增案例|Passed|跨日繼續額外場後完成，ID 保留且 Cycle、Cycle 事件不變；實際 dragTo 後建立新版本且快照不變；同日休息改排下肢並確認 Today；兩項食材 120 g 與 85 g 保存前零筆、保存後兩個不同 ID。|
|RWD|Passed／抽查|13 個狀態各拍手機及桌面，整頁水平溢出均為 0。320、375、768 px 另測 Today、Journal、Day Editor、Insights，含編輯中的長課名，12 次水平溢出均為 0。|
|視覺量測|Passed／抽查|手機 H1 32 px、桌面 44 px。390 px 健康 Sheet 在底部、寬 390 px；1120 px 右側 Panel 自 x=572 起、寬 548 px。手機 Food Logger 全寬。390 px Rest Dock 寬 366 px，底部保留 8 px。|
|鍵盤、Reduced Motion、文字對比|Passed／抽查|健康對話框 Escape 關閉並返回觸發按鈕。Chromium 偏好 reduced motion 時手機導覽 transition duration 為 0s。六條主要路由針對文字及祖先不透明背景作 4.5:1 篩查，修正日期按鈕、訓練卡與歷史等元素後未再命中。未涵蓋圖片、透明疊色、圖示、全部互動狀態或讀屏。|
|切換分頁計時|Passed／抽查|完成工作組後切到另一個 Chromium 分頁再返回，休息秒數繼續前進。未測 OS 鎖屏或 Safari 長時間背景節流。|
|iPhone Safari、Safe Area、軟鍵盤、VoiceOver|Blocked|目前無可控制的 iPhone 或可啟動的 iOS Simulator。桌面 Chromium 改視窗尺寸無法驗證這些項目。|
|真實 OAuth、不同帳戶與跨裝置|Blocked|缺少獨立 staging OAuth 設定與專用測試帳戶；review build 封鎖真實 Supabase。主流程使用 Supabase PKCE 登入、帳戶鍵值區隔的 localStorage，同源分頁經 storage 事件更新。未驗證健康／訓練資料自動上雲。|
|最終 Figma 視覺簽核、全站 Accessibility、完整舊樣式套件|Not Run|Figma 設計端與真機均需補證據。舊版 Black Line 的外觀斷言不代表新設計標準；未宣稱全歷史 E2E 套件通過。|

## Mac 重跑

從儲存庫根目錄執行。使用新瀏覽器設定檔可取得乾淨的示範資料。

~~~sh
git switch redesign/jfs-2-20261119
cd app-source
npm ci
export NEXT_PUBLIC_JFS_REVIEW_PREVIEW=1 NEXT_PUBLIC_JFS_REVIEW_ID=phase3
npm run typecheck
node --import tsx --test tests/*.test.ts
npm run build
npx playwright install chromium
npx playwright test tests/e2e/phase-two-review.spec.ts tests/e2e/phase-two-integrity.spec.js tests/e2e/phase-three.spec.js --workers=1
~~~

下載包解壓後執行 `zsh Preview.command`，需要 Python 3。它僅在本機隨機連接埠提供虛構資料。按 Ctrl-C 停止。若重新啟動換埠，瀏覽器將使用不同 origin 的測試資料。

## 發布前的實機與帳戶驗收

1. 在獨立 HTTPS 測試站用 iPhone Safari 開啟 Review 版本。測一台窄螢幕與一台有 Home Indicator 的裝置。開啟訓練，在最後一個組次輸入重量／次數，切換鍵盤、收起鍵盤、旋轉、點擊 Dock 的延長與停止。在螢幕底緣確認可見與可點擊。
2. 啟動 120 秒休息並記錄開始時間。分別在 Safari 切分頁、切到主畫面與鎖屏 45 秒；返回時比對時間戳。再測 Pause 30 秒，應只有未暫停時間被計算。
3. 在 iPhone 開 VoiceOver，按閱讀順序操作 Today、開啟健康 Sheet、輸入、保存、失敗重試、關閉。檢查欄位名稱、錯誤播報、Sheet 焦點範圍及返回位置；用外接鍵盤重測 Shift-Tab、Escape。
4. 帳戶驗收請使用另一個 staging Supabase 專案和 staging Google callback，停用 Review 種子。建立專用 A/B 帳戶與兩個全新瀏覽器設定檔。先用 A 匯出基準，再新增帶測試標記的一筆餐食與 Session；登出登入 B 確認看不到 A 資料，同裝置重登入 A 比對 ID。第二裝置登入 A 時逐資料類別檢查是否實際出現，不以登入狀態作為同步證據。
5. 帳戶測試後匯出結果，僅從測試設定檔還原測試資料。設計端解除額度限制後逐走原本六個入口，補齊健康 Overlay 的取消、保存與返回，依相同畫面狀態核對截圖。

設計端逐條播放、實機與測試帳戶證據、建置安全警示處置與最終視覺驗收完成後，再進行合併決策。
