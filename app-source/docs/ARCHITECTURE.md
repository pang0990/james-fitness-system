# James Fitness System Development Blueprint — implementation baseline

已確認的 v1.0 完整保留。Local Edition 0.1 是第一個可操作切片，不代表所有架構已實作。

## 路徑

- `/today`：一項 Primary Recommendation、摘要、快捷操作。
- `/onboarding`、`/profile`、`/login`、`/signup`：初始設定與帳戶入口；目前登入頁只說明本機模式。
- `/nutrition`、`/nutrition/plan`、`/nutrition/log`、`/nutrition/foods`、`/nutrition/recipes`。
- `/training`、`/training/cycle`、`/training/session`、`/training/templates`、`/training/exercises`、`/training/warmups`、`/training/activity`。
- `/progress`、`/progress/body`、`/progress/nutrition`、`/progress/training`、`/progress/recovery`、`/progress/weekly`、`/progress/recommendations`、`/progress/history`。
- `/learn`、`/settings`、`/settings/privacy`、`/settings/data`。
- 之後雲端加入 `/training/session/[id]`、`/learn/[slug]`、`/nutrition/recipes/[id]`，目前靜態入口以本機 ID 狀態處理。

## 已實作資料契約

`src/lib/domain.ts` 定義 AppState、Profile、PlanVersion、NutritionDay、Meal、Food、Water、Measurement、Recovery、Session、Segment、Recommendation。

- Profile 1:N PlanVersion；PlanVersion previousId 自我關聯。
- NutritionDay 指向當日 PlanVersion，並保留目標快照。
- Food 1:N Meal，Meal 保存當時份量與營養值，之後內容改版不回寫。
- Meal／Measurement 以 supersedes 自我關聯保留修訂。
- Session 1:N Exercise instance 1:N Segment；RP／Drop parentId 指向主工作組。
- Recommendation 保存輸入、原計畫、规则版本、原因、區間、決策與新版本 ID。
- Water 以反向紀錄修正，不直接抹除原值。
- createdAt 使用 UTC，date 為個人時區日曆日期；本版使用 Asia/Taipei。

## 正式 PostgreSQL Entity 拆分（待 migration 實作）

所有個人表必須有 owner_id → auth.users，外鍵必須同時檢驗 owner，避免僅依 ID 跨使用者連結。所有 RLS policy 基於 auth.uid() = owner_id，無登入拒絕讀写。

| 區域      | Entities 與關係                                                                                                                                                   |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity  | profiles、assessments、consents、safety_flags；user 1:N assessments/flags                                                                                         |
| Content   | content_items 1:N content_versions；food_details、recipe_items、exercise_details、exercise_muscles、warmup_steps、article_sections；引用不可變 content_version_id |
| Rules     | rule_sets 1:N rule_versions；status draft/published/retired，保存來源與測試樣例                                                                                   |
| Plans     | plans 1:N plan_versions；nutrition_targets 3:N nutrition plan version；training_days/exercise_prescriptions N:1 training plan version                             |
| Cycle     | cycles N:1 training_plan_version；cycle_days 保留順延、略過、補練事件；cycle 完成不依肌群缺額延長                                                                 |
| Daily     | daily_snapshots、meal_slots、meal_entries、water_events、body_measurements、recovery_entries、cardio_entries；修訂鏈不覆寫                                        |
| Workout   | workout_sessions 1:N session_exercises 1:N set_groups 1:N set_segments；實際組／總重量／肌群 credit 分開計算                                                      |
| Reviews   | reviews 1:N review_observations；7 天日曆 Review 與 10 天 CUT／非七天 Cycle 各自窗口                                                                              |
| Decisions | recommendations N:1 review；recommendation_decisions；accept transaction 建立 plan_version，一個建議最多一次決策                                                  |
| Companion | companion_states、renderer_preferences；renderer 只讀 domain state，之後可替換 3D                                                                                 |
| Data ops  | audit_events、export_jobs、deletion_jobs；刪除政策與不可覆寫歷史分開處理                                                                                          |

正式 migration 必須加入 unique、check、外鍵、RLS 測試、版本 append-only 限制，不能只把 local JSON 放上雲端即視為完成隔離。

## 決策與版本

User Data → Trend/Rule → Recommendation → 原因與變更預覽 → Accept/Keep → 新 PlanVersion。

Content、Rule、Plan 是三種獨立版本，發布規則與內容不自動變更使用者計畫。Accept 在伺服器端 transaction 重新確認 base version、eligibility、source snapshot、expiry、idempotency，並排定 Nutrition 隔日／Training 下個 Cycle 生效。Keep 留下決策，不建立新 plan version。

本機已實作 Nutrition 流程；跨設備交易保證需等後端。Safety Flags 在正式推薦排序之前處理。

## Content Library

Official／James Master／User 分層。共同欄位：id、owner_id、origin、source_url/source_document、license、attribution、version、status、published_at、supersedes。Recipe 每項引用食物版本，Article 保存來源與審查日期；Exercise／Warm-up 影片允許 null。原始內容與營養快照分開，歷史不依即時內容庫重算。

目前 James Master 來自使用者 Numbers；發布前仍需核對各外部資料授權。User Food 目前只保留於個人瀏覽器。

## 前後端與部署

- Next.js App Router、TypeScript、Tailwind。domain 計算集中於 lib，畫面只呈現與呼叫狀態操作；後續將各功能元件拆出。
- 現階段 GitHub Pages 為靜態本機資料測試入口，無雲端登入、後端或 Supabase 金鑰。
- 正式版移除 output export，Next.js Server 搭配 Supabase PostgreSQL/Auth/Storage，部署至 Vercel。
- Supabase SSR cookies 與伺服器 session 驗證；私有 Storage bucket 與短效 signed URL；不把 service-role key 放前端。
- Storage 保存媒體，資料庫保存來源／授權／檔案 metadata；原始個人表不放公開 bucket。
- Free plan 額度與商業限制在實際建立服務時重新核對，不能把免費視為永久無限制。
- GitHub 保存原始碼與版本，VS Code 編輯後正常 Git 更新。

## 依賴順序與驗收

1. 本機 CUT、日型、log、水、資料快照與基礎操作驗收（本次交付）。
2. 資料完整驗證與匯入還原；雲端 migration、Auth、RLS、同使用者跨設備同步、備份還原。
3. Training Templates/Cycle、可變長排程、略過／補練、計畫與動作版本、Exercise/Warm-up Library。
4. 正式趨勢指標、7 天 Review、GAIN baseline 判斷、推薦優先序／冷卻期與 Safety Flags。
5. Recipe、Article、Companion State/Renderer 與完整體驗整合。

每個切片都保留實際操作驗收；沒有演算法的功能保留資料結構與手動入口，不假造結果。

## 尚需定義

P0：CUT 額外安全下限與速度限制、GAIN 穩定期/門檻/調整幅度、三日型調整套用語意、Pain Safety 四級原文、RP/Drop/左右側/次要肌群/部分完成組 credit。

P1：模板具體內容、營養達成容許區間、Keep 冷卻期與推薦優先序、email 登入方案、水量預設、內容授權、保存與刪除政策。

高成本 3D、Shader、進階自動食譜推薦延後；完整資料與頁面方向保留。
