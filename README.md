# 🍠 地瓜營運記帳（原始程式碼）

線上網址：https://cute0939797210-lgtm.github.io/sweetpotato-ledger/

- 這個 `source` 分支放原始程式碼；`main` 分支是建置好、給 GitHub Pages 用的網站檔案。
- 2026-11-25 重建：原本的原始碼在雲端工作環境重置時遺失，從線上版本還原成 `src/`（React + Tailwind v4），
  並在測試資料下逐頁比對，畫面與送出的資料和線上版完全一致。

## 建置
```
npm install
node build.mjs        # 輸出到 dist/
```
把 `dist/` 的內容複製到 `main` 分支（保留 .nojekyll、README.md）就會上線。

## 資料夾
- `src/pages/`：各頁（Home、Daily 收攤記帳、Entry 單筆記帳、Accounts 帳戶、Reports 報表、Purchases 進貨、StockLedger 庫存、Personal 個人、Settings 設定…）
- `src/components/`：共用元件（ui、CashCounter、TxnList、StallRanking、charts）
- `src/lib/`：資料庫連線（supabase.js）、格式（format.js）、計算、報表、備份、Excel…
- `src/styles.css`：配色（含外觀：烤地瓜／清爽白綠／溫暖奶茶／深色夜市）
- `public/`：index.html、sw.js、圖示、config.js（Supabase 公開金鑰）
- `test/`：假資料（不是真實帳務）＋新舊版本比對腳本
- `tools/rebuild/`：當初從線上版本還原用的腳本
