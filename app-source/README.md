# James Fitness System · Local Edition 0.1

Mobile-first Next.js + TypeScript + Tailwind，黑／白／金介面。此版本為可操作的本機資料測試版；網站可透過 GitHub Pages 開啟，個人紀錄只留在該瀏覽器。

## 已可操作

- 成人基本資料、CUT 原始 Numbers 公式預覽與確認，三種日型目標。
- GAIN Baseline 記錄模式，不推算 TDEE。
- P/C/F 手動紀錄、78 筆來源食物、自訂食物／餐次、份量換算、修正與刪除保留原紀錄。
- 飲水、體重、恢復、手動訓練、Warm-up／Ramp-up／Working／RP／Drop 段落、RIR、計時、Cardio。
- 7／30 天／全部趨勢、週回顧、10 天 CUT 建議、Accept／Keep、隔日計畫版本。
- 本機持久保存、JSON 匯出、資料清除與基本跨分頁版本檢查。

## 尚未接通

Supabase Auth／RLS／雲端同步／資料還原、正式 Training Template／Cycle 排程與版本、Exercise／Warm-up 內容庫、Recipe、Article、Companion State／Renderer。這些保留在 Blueprint，頁面目前明確標示待建立。不是完整 Phase 1 驗收版。

## 開發

Node.js 24（最低依 Next.js 要求）。

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

開發位址 http://127.0.0.1:3000。靜態建置在 `out/`，`npm start` 可於 3100 預覽不含 basePath 的本機建置。

GitHub Pages 子路徑建置：

```sh
NEXT_PUBLIC_BASE_PATH=/summergym.github.io npm run build
```

來源核對見 `docs/FORMULA-AUDIT.md`；完整持續開發架構見 `docs/ARCHITECTURE.md`。

請勿提交 .env、登入憑證、Numbers 原檔或匯出的個人紀錄。不同瀏覽器／網址不共用資料。不要依賴本機儲存作為唯一備份。
