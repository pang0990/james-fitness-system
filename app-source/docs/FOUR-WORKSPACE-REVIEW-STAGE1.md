# JFS｜第一階段：四主頁隔離驗收包

日期：2026-10-21  
產品範圍：Today、Nutrition、Training、Progress  
基準：Draft PR #48（four-workspaces consistency）  
狀態：**獨立預覽 Build／截圖自動化；正式站未修改**

## 目標與限制

1. 提供由目前真實 Next.js UI 建置的 **互動預覽版**，而非單純設計稿。
2. 編入虛構個人資料、兩筆歷史訓練、飲食、飲水、體重及步數，讓所有四頁有具體資料可檢查。
3. 測試模式使用不存在的 Supabase 網域，**不能透過這個預覽登入真實帳號**。
4. 使用獨立 `jfs-isolated-review-v1:` 本機資料鍵；不讀取 `james-fitness-user-v1:`，亦不讀取舊版 `james-fitness-v1`。
5. 預覽版禁用真實 JSON 備份匯入及 PWA Service Worker 註冊；頁首持續揭示「測試預覽」並提供重設虛構資料。
6. 正常建置 **不設定** `NEXT_PUBLIC_JFS_REVIEW_PREVIEW`，Google OAuth 與帳戶資料流程不應改變。
7. 不能宣稱有 iPhone／Android 真機測試，Playwright Chromium 只代表瀏覽器自動化結果。

## 預覽 Build 指令（只在獨立工作目錄使用）

```bash
cd app-source
npm ci
NEXT_PUBLIC_JFS_REVIEW_PREVIEW=1 npm run build
python3 -m http.server 3100 --bind 127.0.0.1 --directory out
```

預覽 `http://127.0.0.1:3100/today/`。其他入口為 `/nutrition/`、`/training/`、`/progress/`。

**不要在正式 GitHub Pages origin 或正式 `main` 上執行預覽部署。** 本機 `localhost` 並不等於手機上的 `localhost`。要真正透過手機遠端查看，需要另外獲得隔離網域及預覽託管環境的操作權限；本階段 GitHub Actions 不會擅自部署到未授權的第三方服務。

## QA 自動化

GitHub Actions Workflow：`.github/workflows/jfs-isolated-review-preview.yml`

兩個互相獨立的工作：

- **production-parity**：一般環境變數下單元測試、TS、正式建置、登入及頁面既有 E2E。
- **isolated-review**：只有設定 preview=1，才跳過真實帳戶流程；執行單元測試、TS、Build、四頁 390px／1440px 螢幕截圖、資料重設與跨頁操作，並輸出 Zip Artifact。

Artifact 內：

- `index.html`：8 張四頁截圖的可直接開啟總覽。
- `screenshots/`：Mobile 與 Desktop 的實際 Chrome 截圖。
- `site/`：可在**獨立靜態伺服器**提供的完整互動測試版。
- `README.md`：現場操作與安全注意事項。
- Playwright Trace：若失敗可重現。

## 人工驗收清單

| 頁面 | 必須試用的操作 | 驗收重點 |
| --- | --- | --- |
| Today | 快速新增飲水、體重、睡眠；今日訓練 | 輸入資料能保存且重新整理後仍存在；Cycle 輪次正確 |
| Nutrition | 記錄餐點、修改餐點、日期切換 | P/C/F、熱量與選擇的餐次一致；錯誤輸入不會寫入 |
| Training | 開始 Session、新增組次、休息計時、暫停、完成、歷史 | Session 可恢復；重複完成不會多推進 Cycle |
| Progress | 切換 7D／30D／90D／1Y、查看 Body 與 Training、Review | 統計依選擇期間；Review 使用自身獨立觀察窗口 |

另檢查 375／390／768／1440px 的排版；手機軟鍵盤、點擊區域、底部導覽與對比度；iPhone Safari 真機尚待人工驗收。

## 尚未完成、不應誤報的工作

- 尚未取得可供手機直接訪問的**獨立 HTTPS 網站 URL**。GitHub Actions Zip 不是預覽主機。
- 尚未完成用戶在真實 iPhone／Android 設備上的手動驗收。
- 未做 Supabase 雲端資料同步、Expo Native App、正式資料遷移。
- PR #43–#48 都未合併至 main，這個預覽 PR 也不可自動合併。

## 使用者下一步

取得由 CI 驗證的 `jfs-four-workspace-isolated-review` Artifact，先從 `index.html` 檢視四頁截圖。若要直接在手機互動，需指定或授權一個**與正式網站不同的預覽主機／Origin**，或在可信任的本機環境啟用暫時性 LAN 連線。未經授權不要用現有 GitHub Pages 正式站當預覽網址。
