# James Fitness System — Training-first iOS/Android SQLite PoC

這是隔離的 **Expo SDK 57 開發測試程式**，不是可上架或可接入正式帳號的 JFS App。使用虛構 UUID 和假 Session，運行在 iOS/Android 的 Expo Runtime，使用 Expo SQLite 的 `withExclusiveTransactionAsync`，共用 `app-source/src/lib/training-offline` 的真實代碼，不建立第二份分歧的 Sync protocol。

## 啟動

```bash
cd app-source && npm ci
cd ../native-poc && npm install
npx expo install --check
npm start
```

Expo Go 使用對應 SDK57 版本；請先核對手機 Expo Go 與 SDK 相容。所有示範資料只在本 App SQLite 中，不讀或刪除 Web 瀏覽器原有的 localStorage。按「新增虛構訓練離線紀錄」寫入本機 Session+Outbox 同一交易；按「重新讀取」可在 App 重啟後確認持久性。

**尚未完成**：
- 真實 iOS/Android 設備安裝與操作；
- Native Auth/OAuth、真正 Supabase 開發帳戶、可用雲端同步；
- 練習計時、組次編輯與完整 Training UI；
- 離線資料加密、遷移、刪除/登出政策；
- App Store / Google Play 出版和相容性驗收。

Native PoC 的帳戶 UUID 固定為虛構身分，正式版必須使用 Supabase getUser() 驗證的身分並建立跨帳戶安全退出流程，不能沿用常數。這個 PoC 不連接正式 Google/Supabase，也不取得個資。
