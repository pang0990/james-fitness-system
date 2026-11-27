# JFS 2.0 — 唯一正式設計方向與發版門檻

狀態：**實作中／Draft，未合併、未部署、雲端 migration 未套用**。

這份文件是往後 JAMES FITNESS SYSTEM 唯一的視覺基準。此前 Cinematic、Glass、Black Line、Companion、明暗切換等版本只保留於 Git 歷史與資料相容性，不再視為候選介面。

## 品牌定位

**Premium Health Intelligence**

- 精品健康科技的克制與可信度。
- 現代數據產品的精度、可讀性與狀態透明。
- 編輯式品牌的文字比例、留白、圖片節奏與敘事。
- 不採遊戲、未來霓虹、浮誇玻璃面板、重複小卡堆疊。

對外展示與 App 採用同一套正式 Light Mode，僅調整動態強度、資訊密度與影像比例。

## Light Mode tokens

| Token | 值 | 使用 |
| --- | --- | --- |
| Canvas | `#F7F8F5` | App 底色 |
| Surface | `#FFFFFF` | 內容面 |
| Ink | `#153B32` | 文字、強調、主操作 |
| Muted | `#5E716A` | 附屬資訊 |
| Border | `#DBE3DC` | 1px 分隔 |
| Brand | `#0E735B` | 資料進度、互動提示 |
| Signal | `#D7E99A` | 極少量的資訊視覺訊號 |
| Display | Georgia / serif | 品牌標語、主要標題、資料故事 |
| UI | Inter / Helvetica Neue / PingFang TC / system-ui | 數據、控制、說明 |

半徑：8px 控件、10–12px 大面板；陰影只用於真正浮動物件。頁面盡量用開放式排版、分隔線與雙欄資訊，而非巢狀卡片。

## 唯一資訊架構

- `/`：對外品牌網站，同時是登入入口。公開、可搜尋。
- `/today`：一個今日重點、直接記餐、飲水／恢復快捷操作。
- `/nutrition`：Journal，Nutrition First + Compact Health Journal。
- `/training`：Training First，Cycle、Session、休息 Dock。
- `/progress`：Insights，重點趨勢與歷史決策。
- `/settings`：帳戶／同步、資料與備份、無障礙。
- `/login`、`/signup`：只為舊連結做轉址，不再維護第二套登入畫面。

公開頁 CTA 採單一 Supabase Google OAuth；現有訪客模式不再開放新註冊，但過去的訪客／舊版本機紀錄仍能由其擁有者明確選擇匯入，舊原始紀錄不刪除。

## Motion

| 場景 | 時間 | 原則 |
| --- | --- | --- |
| 控件 hover／focus | 140ms | 細節回饋，不會左右跳動 |
| 面板切換／資料進度 | 220ms | 只表達狀態變更 |
| App 頁面轉換 | 120–190ms | 短、明確，不擋操作 |
| 品牌區段出現 | 640ms | 編輯式捲動敘事、只播放一次 |

動態優先使用 `opacity`／`transform`，尊重 `prefers-reduced-motion` 與 App 的手動減少動態設定。對比與內容可讀性不可依賴動畫。

## 雲端同步契約（第一階段）

1. 先將 `supabase/migrations/202611250001_account_cloud_snapshots.sql` 套用在**隔離 Supabase 測試專案**，完成匿名與兩帳號 RLS／RPC 負面測試後，再考慮正式環境。
2. 目前所有領域資料以完整 `AppState` 的版本化快照傳輸，資料仍先存於帳號專屬瀏覽器儲存區，離線可用。
3. 遠端表以 `owner_id=auth.uid()` 隔離；瀏覽器沒有 INSERT／UPDATE 權限，只能透過檢查預期版本的 RPC 更新。
4. 新裝置可下載完整帳戶快照，既有裝置變更可安全上傳。兩端同時修改時**不自動覆寫**，必須經由同步衝突介面明確選擇，本機先保留對立版本備份。
5. 只有 UI 顯示「雲端已同步」才代表資料成功上傳。離線、資料庫未啟用、未驗證 OAuth 都不屬於完成。
6. 這是安全的跨裝置同步第一階段，不是逐領域 PostgreSQL 正規化完工。伺服器端的計畫決策交易、細粒度實體索引、完整帳戶刪除／留存政策屬後續獨立驗收項目。

## 必須驗收才可合併與發布

- Google OAuth 完整新登入／回訪／登出／切換帳號。
- 使用兩個**測試** Google 帳戶確認 RLS 隔離；兩部裝置驗證首次上傳、下載、離線回傳、版本衝突與備份。
- 147 既有單元測試加新同步測試、TypeScript、靜態匯出與 Chromium／WebKit 回歸。
- iPhone Safari 真機／Safe Area／鍵盤／VoiceOver／Reduced Motion。
- 品牌站桌面／手機、四大工作區、深層頁面實際視覺核對；確認沒有整頁水平溢出。
- 使用者核對最後 Figma 設計並授權 PR 合併與正式部署。

目前這份工作只修改程式與 schema 檔；**沒有動到任何正式 Supabase 資料或 GitHub Pages 部署**。
