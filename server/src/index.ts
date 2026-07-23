import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

import { auth, AUTH_PATH } from './auth/auth.js';
import { db } from './db/index.js';
import { seedIfEmpty } from './db/seed.js';
import scenariosRouter from './routes/scenarios.js';
import attemptsRouter from './routes/attempts.js';
import historyRouter from './routes/history.js';
import statsRouter from './routes/stats.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const IS_PROD = process.env.NODE_ENV === 'production';

// ---- CORS：開發期前後端分離跨網域，需允許 cookie ----
app.use(
  cors({
    origin: [CLIENT_URL, process.env.BETTER_AUTH_URL || 'http://localhost:3000'],
    credentials: true,
  })
);

// ---- Better Auth handler（必須在 express.json 之前）----
app.all(`${AUTH_PATH}/*`, toNodeHandler(auth));

app.use(express.json());

// ---- 健康檢查（docker healthcheck / Coolify 用）----
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

// ---- 業務 API ----
// /api/me 直接定義（避免 router 掛載與 trailing-slash 問題）
app.get('/api/me', async (req, res) => {
  try {
    const { fromNodeHeaders } = await import('better-auth/node');
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) return res.json({ user: null });
    return res.json({ user: session.user });
  } catch (err) {
    console.error('[/api/me] 取得 session 失敗:', err);
    return res.status(500).json({ error: '內部錯誤' });
  }
});
app.use('/api/scenarios', scenariosRouter);
app.use('/api/attempts', attemptsRouter);
app.use('/api/history', historyRouter);
app.use('/api/stats', statsRouter);

// ---- 靜態檔：正式環境由 Express serve Vue build 產物 ----
if (IS_PROD) {
  const publicDir = resolve(__dirname, '..', 'public');
  if (existsSync(publicDir)) {
    // 只對 /assets 套用長快取（Vite build 產出的 JS/CSS/圖片檔名含 hash，
    // 內容變更時檔名會變，可安全長快取）。
    app.use('/assets', express.static(join(publicDir, 'assets'), {
      maxAge: '7d',
      immutable: true,
    }));
    // 其他靜態檔（如 favicon、robots.txt）：index: false 避免 static 攔截根路徑 /，
    // 讓 index.html 一律由下方的 SPA fallback 處理（不帶長快取，永遠取最新版）。
    app.use(express.static(publicDir, {
      index: false,
      maxAge: '5m',
    }));
    // SPA fallback：非 /api、/api/auth 路徑都回 index.html（含根路徑 /）
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(join(publicDir, 'index.html'));
    });
  } else {
    console.warn('[server] 正式環境但找不到 public/ 目錄，未啟用靜態檔服務。');
  }
}

// ---- 全域錯誤處理 ----
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: '伺服器錯誤' });
});

// ---- 啟動 ----
async function main() {
  // 種子題庫（若 DB 為空才注入）
  try {
    const inserted = await seedIfEmpty(db);
    if (inserted) console.log(`[seed] 已注入 ${inserted} 個情境題庫`);
  } catch (err) {
    console.error('[seed] 種子注入失敗:', err);
  }

  app.listen(PORT, () => {
    console.log(`[server] 詐騙訓練網站 API 已啟動 → http://localhost:${PORT}`);
    console.log(`[server] 環境=${process.env.NODE_ENV || 'development'}`);
    if (!IS_PROD) console.log(`[server] 前端請打開 ${CLIENT_URL}`);
  });
}

main().catch((err) => {
  console.error('[server] 啟動失敗:', err);
  process.exit(1);
});
