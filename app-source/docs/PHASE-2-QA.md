# James Fitness System 2.0 第二階段驗收紀錄

2026-11-19｜Draft PR #70｜隔離資料｜目前判定 **No-Go**。

|驗收範圍|結果|本輪證據及界線|
|---|---|---|
|TypeScript|Passed|npm run typecheck 成功。|
|單元測試|Passed|146 通過，0 失敗、跳過或取消。涵蓋過期排程、逐動作未完成組數、版本變更摘要等。|
|Review 靜態建置|Passed|Next.js 匯出 79 頁並產出 PWA。|
|Chromium 操作驗證|Passed|瀏覽器載入本次靜態輸出，在隔離 origin 以檔案回應網頁請求。下列流程通過。|
|標準 Playwright CLI 連線到本機 HTTP server|Blocked|環境限制監聽本機埠。下方提供在 Mac 重新執行的指令。|
|響應式抽查|Passed|Today 在 375、768、1440px 無整頁水平溢出。窄螢幕操作訓練流程、桌面操作健康紀錄。|
|完整 RWD、iOS 真實鍵盤、Safe Area 與背景分頁節流|Not Run|尚需實機 Safari、不同高度、分頁背景與返回的完整驗收。|
|鍵盤操作抽查|Passed|健康紀錄對話框可用鍵盤開啟、Escape 關閉並返回觸發點。|
|全站 Accessibility 驗收|Not Run|尚需 VoiceOver、對比、各頁焦點順序與 reduced motion 驗收。|
|本機資料一致性抽查|Passed|已驗證重試、連點、組次母子關係、日期、Session Snapshot 與第二場分開保存。|
|真實 Google OAuth、帳戶切換與跨裝置同步|Not Run|Review 使用隔離資料。原 app 有 Supabase OAuth / PKCE 與依使用者區隔的本機儲存；本次未驗證正式帳戶回登入或逐資料類型的雲端往返。|

## 瀏覽器實際操作結果

- Today 繼續訓練，切換動作並保留各自草稿。完成工作組後只有重量預填，次數與 RIR 留白。模擬儲存失敗可重試，連點只產生一組。
- Warm-up、Ramp-up、Drop、RP 分別記錄。Drop 與 RP 指向原工作組。編輯可撤銷，刪除母組後可還原母組與原有子組。
- 間休延長、切換動作、暫停、重新載入與恢復。手動 RP 計時可啟動、延長、停止。測試曾重現底部 Dock 定位及 RP 控制重疊，修正後重測通過。
- Finish Review 比對每個動作實際與計畫工作組，部分完成選 Keep，保存後進 Summary；草稿仍可追溯。同日第二場保留獨立 ID，歷史詳情可開啟，Cycle 事件未重複增加。
- Today 單筆飲食儲存失敗保留克數，重試只產生一筆，返回來源。Recent 與一般搜尋帶入不同的正確份量，Batch Plate 可保存。Journal 飲水、體重與恢復依選定日期保存。
- Training Plan 編輯後顯示版本差異，保存產生新版本，對照先前 Session Snapshot 未變動。刪除的 Day ID 不應讓 Today 誤開下一個待練日；原行事曆資料保留，需重新指派才可啟動。

## Mac 重跑

需要可執行專案依賴的 Node.js、npm、Python 3 與可安裝的 Chromium。請在儲存庫根目錄執行：

~~~sh
git switch redesign/jfs-2-20261119
cd app-source
npm ci
npm run typecheck
npm test
NEXT_PUBLIC_JFS_REVIEW_PREVIEW=1 NEXT_PUBLIC_JFS_REVIEW_ID=phase2 npm run build
npx playwright install chromium
npx playwright test tests/e2e/phase-two-review.spec.ts tests/e2e/review-preview.spec.ts
~~~

單獨預覽可在 build 後執行 npm run start，開啟 http://127.0.0.1:3100/today/。下載版解壓後於終端執行 zsh Preview.command，使用 Python 3 的隨機 loopback 埠。預覽使用範例資料；重新啟動若換埠，瀏覽器會使用另一個儲存空間。Ctrl-C 結束預覽。

## 合併前仍需驗收

- 在真機驗收軟鍵盤、Safe Area、背景計時、全站鍵盤與讀屏；補齊完整狀態與各畫面視覺驗收。
- 補測訓練結束保存失敗重試、部分完成 Count、額外訓練、版本變更與行事曆重排的整合邊界，以及 Food Batch 失敗重試。
- 以專用測試帳號、可還原的測試資料，確認登入、登出、重新登入、不同帳戶與兩裝置同步範圍。
- 原 Figma 檔新增 Design System，內含 18 個原生元件與 24 個 Light Variables。Dark Mode 受到檔案方案限制。元件實例綁定、Variants、Auto Layout 全面覆蓋、三條可點擊流程及設計驗收仍待完成。
