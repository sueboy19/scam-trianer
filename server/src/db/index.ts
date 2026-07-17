import Database from 'better-sqlite3';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { SCHEMA_SQL } from './schema.js';

/**
 * SQLite 連線（單例）。
 * - 開啟 WAL 模式：多用戶讀寫並發更佳，讀寫不互鎖。
 * - busy_timeout：寫入衝突時短暫重試，避免偶發 SQLITE_BUSY。
 * - foreign_keys：啟用外鍵（step_responses.on delete cascade 用得到）。
 */
function createDb(): Database.Database {
  const dbPath = process.env.DB_PATH || './data/app.db';
  const absPath = resolve(dbPath);

  // 確保目錄存在（避免 better-sqlite3 開檔失敗）
  const dir = dirname(absPath);
  mkdirSync(dir, { recursive: true });

  const db = new Database(absPath);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('foreign_keys = ON');

  // 建立業務表格（IF NOT EXISTS，可重複執行）
  db.exec(SCHEMA_SQL);

  return db;
}

// 單例：整個 process 共用一個連線（better-sqlite3 為同步 API，單連線即可）
export const db = createDb();
