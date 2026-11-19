import type Database from 'better-sqlite3';

/**
 * Better Auth 資料表 schema（better-auth 1.7.26，由 @better-auth/cli generate 產出）。
 *
 * better-auth 1.7 起啟動會做 schema 檢查：缺表或缺欄位會直接拋
 * SCHEMA_MISMATCH（舊版是 lazy 自動建表）。正式環境的 volume DB
 * 可能由舊版建立，故啟動時以冪等 DDL 補齊（存在則跳過）。
 */

const AUTH_TABLE_DDL: string[] = [
  `create table if not exists "user" (
    "id" text not null primary key,
    "name" text not null,
    "email" text not null unique,
    "emailVerified" integer not null,
    "image" text,
    "createdAt" date not null,
    "updatedAt" date not null
  )`,
  `create table if not exists "session" (
    "id" text not null primary key,
    "expiresAt" date not null,
    "token" text not null unique,
    "createdAt" date not null,
    "updatedAt" date not null,
    "ipAddress" text,
    "userAgent" text,
    "userId" text not null references "user" ("id") on delete cascade
  )`,
  `create table if not exists "account" (
    "id" text not null primary key,
    "accountId" text not null,
    "providerId" text not null,
    "userId" text not null references "user" ("id") on delete cascade,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" date,
    "refreshTokenExpiresAt" date,
    "scope" text,
    "password" text,
    "createdAt" date not null,
    "updatedAt" date not null
  )`,
  `create table if not exists "verification" (
    "id" text not null primary key,
    "identifier" text not null,
    "value" text not null,
    "expiresAt" date not null,
    "createdAt" date not null,
    "updatedAt" date not null
  )`,
];

/** 舊版 better-auth 建的表可能缺的欄位（ALTER 僅補欄位存在性，不帶約束） */
const AUTH_COLUMNS: Record<string, Record<string, string>> = {
  user: {
    id: 'text',
    name: 'text',
    email: 'text',
    emailVerified: 'integer',
    image: 'text',
    createdAt: 'date',
    updatedAt: 'date',
  },
  session: {
    id: 'text',
    expiresAt: 'date',
    token: 'text',
    createdAt: 'date',
    updatedAt: 'date',
    ipAddress: 'text',
    userAgent: 'text',
    userId: 'text',
  },
  account: {
    id: 'text',
    accountId: 'text',
    providerId: 'text',
    userId: 'text',
    accessToken: 'text',
    refreshToken: 'text',
    idToken: 'text',
    accessTokenExpiresAt: 'date',
    refreshTokenExpiresAt: 'date',
    scope: 'text',
    password: 'text',
    createdAt: 'date',
    updatedAt: 'date',
  },
  verification: {
    id: 'text',
    identifier: 'text',
    value: 'text',
    expiresAt: 'date',
    createdAt: 'date',
    updatedAt: 'date',
  },
};

const AUTH_INDEX_DDL: string[] = [
  `create index if not exists "session_userId_idx" on "session" ("userId")`,
  `create index if not exists "account_userId_idx" on "account" ("userId")`,
  `create index if not exists "verification_identifier_idx" on "verification" ("identifier")`,
];

/** 冪等補齊 Better Auth 的四張表與欄位（重複執行無副作用） */
export function ensureAuthSchema(db: Database.Database): void {
  for (const ddl of AUTH_TABLE_DDL) db.exec(ddl);

  for (const [table, columns] of Object.entries(AUTH_COLUMNS)) {
    const existing = new Set(
      (db.pragma(`table_info("${table}")`) as { name: string }[]).map((c) => c.name)
    );
    for (const [column, type] of Object.entries(columns)) {
      if (!existing.has(column)) {
        db.exec(`alter table "${table}" add column "${column}" ${type}`);
      }
    }
  }

  for (const ddl of AUTH_INDEX_DDL) db.exec(ddl);
}
