# JFS Web V3｜正式發布驗收閘門與回復計畫（2026-10-22）

## 目的

將 Today、Nutrition、Training 3.0、Progress 的已驗證改版整理為單一可審查 Release Candidate，**保留所有目前正式網站與本機使用者資料**。這份文件僅用於準備和審核，不代表已完成發布。

## 目前可確認

- 正式 GitHub Pages 源自 `main`，基準 SHA：`4667095c4996566492eb5470c902813e9f58fc8a`（執行發布時必須重新核對）。
- Web 資料由登入 Google 帳戶 ID 對應至 `james-fitness-user-v1:<userId>`；此外有未認領舊版 `james-fitness-v1` 原始快照。
- 使用者資料不在此 GitHub Repo，也未上傳 Supabase 的健身個人資料表；**單靠 GitHub 原始碼備份無法還原手機／瀏覽器內的本機紀錄**。
- 發布流程為 `.github/workflows/publish-jfs-pages.yml`：對 main 的 `app-source/**` push 會執行 Typecheck、Unit、`pages:prepare`，且將 build 產物 commit／push 回 main。
- `pages:prepare` 使用 `NEXT_PUBLIC_BASE_PATH=/james-fitness-system`；普通 root-path Next build PASS 不等於 GitHub Pages 發布已驗收。
- PR #43、#44 為獨立兄弟分支；#45 疊 #44、#46 疊 #45，#47→#48→#49→#50 為後續堆疊。**不能只合併最上層 PR #50（base #49）就認為 main 已更新**。

## Gate A｜四頁 CI（必須全部 PASS）

- Preview：合成身分登入、Today／Nutrition／Training／Progress 操作旅程、資料重載與返回、390px 與桌面圖片；375、390、768 瀏覽器測試。
- Ordinary build：Typecheck、完整 Unit、全部既有 Chromium Playwright E2E、Next 靜態建置。
- GitHub Pages Dry Run：`npm run pages:prepare` 並驗證四條正式頁面與有正確 basePath 的 PWA manifest；不 push、不部署。
- 真機 iPhone Safari 的軟鍵盤、瀏海安全區及導航尚需使用者人工驗收；Chromium Mobile 模擬不等於實機。
- 列出任何新 FAIL 並修復後重跑，不能以跳過測試掩蓋。

## Gate B｜正式資料外部備份（發布前必須由持有資料的使用者完成）

1. 在**原本的正式網址、原本常用的裝置及瀏覽器**登入使用者 Google 帳號；不要在 Netlify 測試站操作正式資料。
2. 開啟 `https://pang0990.github.io/james-fitness-system/settings/data/`。
3. 點「匯出 JSON 備份」，再點「匯出原始儲存資料」。兩份 JSON 皆必須在裝置檔案中實際存在、非 0 KB；不應只看到 App 顯示「已匯出」就當作成功。
4. 確認備份檔的建立日期、內容（`schemaVersion`、`revision`、`sessions`、`meals`、`measurements` 等集合），**不要將含真實健康資料的 JSON 上傳到公開 GitHub PR、Netlify 或聊天**。
5. 安全地另存一份到裝置外的私人空間，保留所有舊備份直到新正式站實測通過。驗收只需要使用者告知「已安全下載並備份」，不需要提供檔案內容。
6. 新版本測試如有問題，不要按「清空資料」、「刪除帳戶」或不明備份還原；先確認目前瀏覽器 storage 是否仍完整。

**BLOCKED：開發工具無法存取使用者真實瀏覽器 localStorage，因此不能代替使用者完成此 Gate。**

## Gate C｜整合 PR 依賴與發布許可

建議：先以本分支實際 Head 和當下 main 的唯一共同祖先，建立一份**單一 Web V3 Release PR（base main）**，完整呈現合併後 70+ commits 的差異及發布後構建影響。避免逐個合併重複改動的 Draft PR（尤其 Glass #43 與 Integration #46）而發生重複衝突。保留舊 PR 作為開發證據，不直接改寫 main。

- 確認沒有來自正式用戶的秘密憑證或真實資料寫入原始碼。
- `NEXT_PUBLIC_JFS_REVIEW_PREVIEW` 在正式構建中必須未設定；不得使用 Preview 虛構使用者編譯正式站。
- PR 中的 Netlify 測試身分／無效 endpoint，不可意外進入普通運行模式。
- 最終 Web release 必須使用已通過 CI 的確切 commit SHA，不要用未測的新 commit 代替。
- 備份已存在、PR 審查 PASS、獲得使用者**具體的合併／發布確認**後，才合併 main。
- 後續 GitHub Action 發布需要驗證 live HTTPS 四頁、Google OAuth、PWA 更新，以及原裝置舊資料是否仍存在。

## Gate D｜發布後與回復

1. 保存 release 前 main SHA、release HEAD、GitHub Action run ID、網站截圖及真實 user-side 備份確認狀態。
2. 若新版有功能缺陷，優先使用 Draft hotfix 經 CI 修正再發。若需回退，先確認新版本有沒有寫入舊版本不能解讀的新欄位。
3. **警告**：本次修正有效的 `skippedMealSlots` 日期格式；原 main 的驗證式有缺陷。新版本保存該資料後，直接回退舊 main 可能使它無法讀取新快照。不能假設 `git revert` 單獨就能安全回復使用者資料，應優先 `fix-forward` 或加入向後相容修補。
4. 如必須程式回退，建立有測試的 rollback PR 並發布，再由使用者核對備份與目前紀錄；**不可直接覆寫瀏覽器 localStorage**。
5. 公開站 `main` 不得產生新的試驗性帳號、Supabase Schema 或 Native 資料寫入。

## Gate E｜與 Native 工作切開

共用 Training Core、隔離 Supabase Dev、IndexedDB/SQLite Outbox、最小 Web→iOS→Android 同步 PoC 和完整 Expo UI 放在**後續獨立 Draft PR**，不能因尚未完成而悄悄混入上述 Web Release PR，更不能聲稱現有 Web 已有三端同步。

## 狀態

- 2026-10-22：本 QA PR 已新增 Nutrition 日期防護與四頁完整操作旅程測試。
- Gate A：以最新 GitHub Actions Head 驗收結果為準。
- Gate B：**BLOCKED－需要使用者原裝置完成外部 JSON 備份。**
- Gate C：等待 Gate A/B 及使用者授權；**未合併 main、未正式部署**。
- Gate D：正式發布後才能實測。
- Gate E：可在獨立 Draft PR 開發，不碰正式 DB。
