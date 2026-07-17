# 🛡️ 防詐達人 — 台灣詐騙防制訓練網站

透過擬真情境（來電、簡訊、LINE 對話、社群貼文）練習辨識詐騙，登入後記錄成績，並查看「最多人犯的錯」排行榜，大家一起進步。

## ✨ 功能

- **情境練習**：3 大類詐騙（簡訊/電話、加密/新興、社群媒體），每個情境 3–5 個決策步驟
- **擬真 UI**：依情境類型呈現來電畫面、簡訊泡泡、LINE 對話、社群貼文
- **即時回饋**：每題答完顯示對錯與詳細解釋
- **成績記錄**：登入後每次測驗計分、記錄個人歷史與各情境最佳成績
- **常見錯誤排行榜**：統計全站「錯誤率最高」的題目，提前避險
- **多社群登入**：Google / LINE / Facebook / Instagram（Better Auth）
- **低資源部署**：單容器 + SQLite，~150MB RAM，Coolify 一鍵部署

---

## 🧱 技術棧

| 項目 | 選擇 |
|---|---|
| 前端 | Vue 3.5 + Vite + Tailwind CSS + Vue Router + Pinia |
| 後端 | Node.js + Express |
| 資料庫 | SQLite（`better-sqlite3`，WAL 模式）|
| 登入 | [Better Auth](https://better-auth.com)（Google/LINE/FB/IG，cookie session）|
| 部署 | Docker Compose（單容器）→ Coolify |

---

## 🚀 本機開發

### 環境需求
- Node.js ≥ 20（建議在 WSL / macOS / Linux）
- npm 10+

### 啟動

```bash
# 1. 安裝所有依賴（client + server + 根目錄工具）
npm run install:all

# 2. 複製環境變數範本，填入你的 OAuth 憑證（可先不填，未登入也能測驗）
cp .env.example .env

# 3. 啟動前後端（client :5173 + server :3000，hot reload）
npm run dev
```

開啟 http://localhost:5173 即可使用。Vite 會自動把 `/api` 代理到 `:3000`。

### 個別操作

```bash
npm run dev:api      # 只跑後端
npm run dev:web      # 只跑前端
npm run build        # build 兩端（client → server/public，server → server/dist）
npm run typecheck    # 型別檢查
npm run seed         # 手動重跑種子注入（DB 為空才會插入）
```

> ⚠️ 本機開發**不需要 Docker**。Docker 是給正式部署用的。

---

## 🐳 Docker

### 開發環境（容器化，hot reload）

```bash
docker compose up --build
# client → http://localhost:5173, api → http://localhost:3000
```

### 正式環境（單容器，給 Coolify 用）

```bash
docker compose -f docker-compose.prod.yml up --build -d
# → http://localhost:3000（Express 同時 serve API + 靜態 Vue）
```

正式環境需設定環境變數（見下方）。

---

## ☁️ Coolify 部署

1. **Push 到 Git repo**（GitHub / GitLab / 自架 Gitea 皆可）
2. 在 Coolify 建立 **New Resource** → 連結 repo
3. **Build Pack** 選 `Docker Compose`
4. **Compose Path** 設為 `docker-compose.prod.yml`
5. **Environment Variables**：填入下方所有變數（secrets 不要 commit）
6. **Domains**：設 `https://你的網域`，綁到 `app` service 的 port `3000`
7. **Storages**：確認 `/app/data` 有 persistent storage（保護 SQLite 不被重新部署清空）
8. DNS A record 指向 VM IP → 部署。Traefik 會自動處理 HTTPS 憑證。

---

## 🔑 OAuth 登入憑證申請

`server/src/auth/auth.ts` 只註冊「有設環境變數」的 provider，沒設的會自動跳過。

### Google
- 到 [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → 建立「OAuth 2.0 Client ID」
- Authorized redirect URI 填：`https://你的網域/api/auth/callback/google`
- 設 `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`

### LINE（台灣重點）
- 到 [LINE Developers Console](https://developers.line.biz/) → 建立「LINE Login」頻道（類型選 **Web App**）
- Redirect URI 填：`https://你的網域/api/auth/callback/line`
- 設 `LINE_CHANNEL_ID`（= client_id）/ `LINE_CHANNEL_SECRET`（= client_secret）
- ⚠️ LINE 預設只給 `profile`，email 需額外審核；本系統以 LINE userId 為主鍵，**不依賴 email**

### Facebook / Instagram
- 到 [Meta for Developers](https://developers.facebook.com/) → 建立 App → 加 Facebook Login
- Instagram 登入使用「Instagram API with Instagram Login」（舊的 Basic Display API 已停用）
- Valid OAuth Redirect URI：`https://你的網域/api/auth/callback/facebook`（與 instagram）
- 設 `FACEBOOK_CLIENT_ID/SECRET`、`INSTAGRAM_CLIENT_ID/SECRET`
- ⚠️ Meta App 通常需通過 App Review 才能給非測試使用者

### Better Auth
- `BETTER_AUTH_SECRET`：用 `openssl rand -base64 32` 產生隨機字串
- `BETTER_AUTH_URL`：你的正式網域（如 `https://app.example.com`）

---

## 📚 題庫擴充

題庫存於 `scripts/scenarios-seed.json`，每個情境結構：

```jsonc
{
  "id": "guess-who",                       // 唯一 ID
  "category": "sms_call",                  // sms_call | crypto_emerging | social_media
  "scam_type": "猜猜我是誰",
  "title": "陌生來電：猜猜我是誰",
  "description": "...",
  "icon": "📞",                            // emoji
  "difficulty": 1,                         // 1~3
  "sort_order": 1,
  "source_url": "https://165.npa.gov.tw/",
  "steps_json": "{\"steps\":[...]}"        // 字串化的 JSON（見下方）
}
```

`steps_json` 內每步驟：

```jsonc
{
  "stepIndex": 0,
  "uiType": "phone_call",                  // phone_call | message | email | chat | social_post
  "scenario": "情境說明（給使用者看）",
  "dialogue": "「對話內容」",
  "image": null,
  "choices": [
    { "text": "選項A", "correct": false, "explanation": "為什麼錯" },
    { "text": "選項B", "correct": true,  "explanation": "為什麼對" }
  ]
}
```

新增情境後：編輯 JSON → 刪除 `data/app.db`（或清空 scenarios 表）→ 重啟，`seedIfEmpty` 會自動注入。

> 題庫內容主要參考 [165 全民防騙網](https://165.npa.gov.tw/)、[165 打詐儀錶板](https://165dashboard.tw/)、刑事警察局《常見詐騙手法話術解析》。

---

## 🗂️ 專案結構

```
.
├─ client/              # Vue 前端（build 後輸出到 server/public）
├─ server/              # Express 後端
│  ├─ src/
│  │  ├─ auth/          # Better Auth 設定
│  │  ├─ db/            # SQLite 連線 + schema + seed
│  │  ├─ routes/        # API（me/scenarios/attempts/history/stats）
│  │  └─ utils/         # auth-guard middleware
│  ├─ public/           # （build 產物，git ignored）
│  └─ dist/             # （TS 編譯產物，git ignored）
├─ scripts/
│  ├─ scenarios-seed.json   # 種子題庫
│  └─ generate-scenarios.mjs  # （未來）離線生成腳本
├─ docker-compose.yml          # 開發環境（client + api 雙容器 + HMR）
├─ docker-compose.prod.yml     # 正式環境（單容器，Coolify 用）
├─ Dockerfile                  # 正式 build
└─ Dockerfile.dev              # 開發依賴安裝
```

---

## 🆘 遇到詐騙

- **165 反詐騙專線**（24 小時）
- **110** 報案
- [165 打詐儀錶板](https://165dashboard.tw/) 查證可疑帳號 / 網址

> 一聽、二掛、三查證。
