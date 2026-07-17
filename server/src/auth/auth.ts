import { betterAuth } from 'better-auth';
import Database from 'better-sqlite3';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

/**
 * Better Auth 實例。
 *
 * - database：用同一顆 SQLite（但給 Better Auth 專屬連線，避免與業務連線的 WAL pragma 衝突）
 * - socialProviders：只註冊「有設憑證」的 provider，未設憑證會自動跳過
 * - session：cookie-based DB session（預設），HttpOnly + SameSite=Lax，SPA 適用
 *
 * 注意：Better Auth 會自動建立 user / account / session / verification 四張表。
 */
function buildSocialProviders() {
  const providers: Record<string, { clientId: string; clientSecret: string; scope?: string[] }> = {};

  // Google
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }

  // Facebook
  if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    providers.facebook = {
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    };
  }

  // LINE（台灣重點）
  if (process.env.LINE_CHANNEL_ID && process.env.LINE_CHANNEL_SECRET) {
    providers.line = {
      clientId: process.env.LINE_CHANNEL_ID,
      clientSecret: process.env.LINE_CHANNEL_SECRET,
      // LINE 預設只給 profile；email 需額外申請審核，故不依賴 email
      scope: ['profile', 'openid'],
    };
  }

  // Instagram（透過 Meta / Instagram API with Instagram Login）
  if (process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET) {
    providers.instagram = {
      clientId: process.env.INSTAGRAM_CLIENT_ID,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
    };
  }

  return providers;
}

export const auth = betterAuth({
  database: {
    /**
     * 給 Better Auth 一條獨立的 SQLite 連線，指向同一個檔案。
     * 開啟 WAL 後多連線共存沒問題。
     */
    db: (() => {
      const dbPath = resolve(process.env.DB_PATH || './data/app.db');
      mkdirSync(dirname(dbPath), { recursive: true });
      return new Database(dbPath);
    })(),
    type: 'sqlite',
  },
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET || 'dev-only-insecure-secret-change-me',
  socialProviders: buildSocialProviders(),
  session: {
    // cookie session；cookie 預設 HttpOnly、SameSite=Lax
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 分鐘
    },
  },
  // 標準 trustedOrigins：允許前端開發網域的跨站請求帶 cookie
  trustedOrigins: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  ],
});

// 路徑輔助：Better Auth 的 handler 掛在 /api/auth/*
export const AUTH_PATH = '/api/auth';
