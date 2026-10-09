# James Fitness System

測試入口：https://pang0990.github.io/summergym.github.io/

目前為 Local Edition 0.1，資料僅保存在各自瀏覽器，尚無雲端帳戶或同步。

可編輯原始碼在 `app-source/`。完整範圍與待辦見 [App README](app-source/README.md) 和 [Development Blueprint](app-source/docs/ARCHITECTURE.md)。公式核對見 [Numbers audit](app-source/docs/FORMULA-AUDIT.md)。

## VS Code 更新

```sh
cd app-source
npm ci
npm run dev
# 修改、驗證後重建根目錄 Pages 檔案
npm test
npm run pages:prepare
cd ..
git add .
git commit -m "Update James Fitness System"
git push
```

GitHub Pages 從儲存庫根目錄發布已建置檔案。不要只修改 source 就假設根目錄會自動重新建置；先執行 pages:prepare。舊網站保留在 Git 歷史。
