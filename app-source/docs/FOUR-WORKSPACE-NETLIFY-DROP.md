# JFS｜獨立 HTTPS 手機預覽發布指引（Netlify Drop）

**用途**：把已經完成 CI 驗收的虛構資料預覽版，發布到與正式 JFS GitHub Pages **不同來源（origin）** 的 `https://<站名>.netlify.app`，供手機測試四頁。

**重要**：此預覽版預設為**公開網址**，不是帳號保護的私有環境。資料僅儲存在各訪客當前瀏覽器的獨立 `localStorage`，但請不要填入真實姓名、健康資料、Email、密碼或上傳真實 JSON 備份。不要把此版當正式服務。

## 已由 GitHub Actions 準備好的檔案

Workflow：`.github/workflows/jfs-isolated-review-preview.yml`

最新成功執行後，CI 的 `isolated-review` job 提供兩個獨立 ZIP：

- **`jfs-isolated-preview-netlify-drop`**：已完成編譯並在 ZIP 根目錄含 `index.html`、`today/`、`nutrition/`、`training/`、`progress/`、`_next/`。**這份是要上傳 Netlify Drop 的檔案**。
- `jfs-four-workspace-isolated-review`：八張真實瀏覽器截圖總覽、完整測試網站、README 及 Trace。**不是要上傳的 ZIP**。

## 使用獨立 HTTPS 網址

1. 下載最新 **成功** CI 中的 `jfs-isolated-preview-netlify-drop` ZIP；確認它包含 ZIP 根層的 `index.html`，不要誤用包著 `review-kit/` 的另一份 ZIP。
2. 在瀏覽器開啟 https://app.netlify.com/drop ，用拖曳或選擇檔案上傳 **此 ZIP**。Netlify 會提供獨立的 `https://…netlify.app` 網址。可使用個人 Netlify 帳戶保存並管理預覽網站。
3. 打開新網址的 `/today/`、`/nutrition/`、`/training/`、`/progress/`；不應要求真實 Google 登入，且頂部應始終有 `JFS · TEST PREVIEW`。
4. 用手機開啟 **Netlify 新網址**，依 `FOUR-WORKSPACE-REVIEW-STAGE1.md` 逐頁測試。網頁內的「重設示範資料」只清除此預覽版的本機資料。
5. 再將實際取得的 URL 回傳給開發流程做 HTTPS、HTTP Header、跨頁導航與手機人工驗收。**未取得實際站點前不得推定 URL 或標記發布 PASS**。

Netlify Drop 官方文件：https://docs.netlify.com/start/quickstarts/netlify-drop-quickstart/

## 部署後必須驗收

- 網站網址屬於 `netlify.app` 或另外授權的**獨立網域**，不得使用正式 JFS 的 `pang0990.github.io` 同源路徑。
- `https://<site>.netlify.app/today/` 可載入已建立的虛構使用者資料。
- `nutrition/`、`training/`、`progress/` 可以在手機直接存取或重新整理。
- `_headers` 應使 HTTP 回應包含 `X-Robots-Tag: noindex, nofollow, noarchive`；`robots.txt` 應為 `Disallow: /`。**noindex 並不等於密碼保護。**
- Network 面板不應有到真實 `*.supabase.co` 的請求；測試版不能呼叫雲端資料 API。
- 正式 GitHub Pages `main`、原始帳戶、OAuth 設定、真實資料皆沒有變更。
- 真正的 iPhone Safari／Android Chromium UI 測試，需在真機上完成才能標為 PASS。

## 如何更新及清除

下一批預覽版變更須重新跑 CI，下載新的部署 ZIP，再至 Netlify 站點 Deploys 進行手動上傳。驗收結束後，可由站點管理者取消發布或刪除測試網站。

### 範圍界線

本 PR 只建立經驗收的 **Netlify Drop 發布包**，沒有使用或儲存 Netlify 存取憑證，也**沒有代替使用者登入 Netlify 或完成公開部署**。
