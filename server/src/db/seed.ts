import type Database from 'better-sqlite3';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface SeedScenario {
  id: string;
  category: 'sms_call' | 'crypto_emerging' | 'social_media';
  scam_type: string;
  title: string;
  description: string;
  icon: string;
  difficulty: number;
  steps_json: string;
  source_url?: string;
  sort_order: number;
}

/**
 * 找出種子題庫 JSON 的路徑。
 * 嘗試多個候選位置以同時支援：
 *   - dev（tsx 跑 src/db/seed.ts）：__dirname = .../server/src/db
 *   - prod（node 跑 dist/db/seed.js）：__dirname = .../server/dist/db
 *   - 容器內（WORKDIR=/app）：種子放在 /app/scripts/
 */
function findSeedPath(): string | null {
  const candidates = [
    process.env.SEED_PATH,                          // 明確指定
    join(__dirname, '..', '..', '..', 'scripts', 'scenarios-seed.json'), // dev: src/db → repo/scripts
    join(__dirname, '..', '..', 'scripts', 'scenarios-seed.json'),       // prod: dist/db → repo/scripts
    resolve(process.cwd(), 'scripts', 'scenarios-seed.json'),            // 容器 cwd=/app
    '/app/scripts/scenarios-seed.json',                                   // 容器絕對路徑 fallback
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    if (p && existsSync(p)) return p;
  }
  return null;
}

function loadSeedScenarios(): SeedScenario[] | null {
  const seedPath = findSeedPath();
  if (!seedPath) {
    console.warn('[seed] 找不到 scenarios-seed.json，跳過題庫同步');
    return null;
  }
  let raw: string;
  try {
    raw = readFileSync(seedPath, 'utf8');
  } catch {
    console.warn(`[seed] 讀取 ${seedPath} 失敗，跳過題庫同步`);
    return null;
  }
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) {
      console.warn('[seed] scenarios-seed.json 內容非空陣列，跳過題庫同步');
      return null;
    }
    return arr as SeedScenario[];
  } catch {
    console.warn('[seed] scenarios-seed.json 不是合法 JSON，跳過題庫同步');
    return null;
  }
}

export interface SyncResult {
  /** 種子檔中 DB 原本沒有、本次新插入的題數 */
  inserted: number;
  /** 種子檔總題數 */
  total: number;
}

/**
 * 題庫同步（冪等 upsert）——每次啟動執行：
 *   - 新情境 → 插入
 *   - 既有情境 → 更新題目內容（ON CONFLICT DO UPDATE，非刪除重插，
 *     attempts / step_responses 對 scenarios.id 的參照與統計不受影響）
 *   - 種子檔中已移除的情境 → 保留不刪（維護使用者歷史紀錄完整）
 */
export function syncScenarios(db: Database.Database): SyncResult {
  const scenarios = loadSeedScenarios();
  if (!scenarios) return { inserted: 0, total: 0 };

  const now = Date.now();
  const upsert = db.prepare(`
    INSERT INTO scenarios
      (id, category, scam_type, title, description, icon, difficulty, steps_json, source_url, sort_order, created_at, updated_at)
    VALUES
      (@id, @category, @scam_type, @title, @description, @icon, @difficulty, @steps_json, @source_url, @sort_order, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      category    = excluded.category,
      scam_type   = excluded.scam_type,
      title       = excluded.title,
      description = excluded.description,
      icon        = excluded.icon,
      difficulty  = excluded.difficulty,
      steps_json  = excluded.steps_json,
      source_url  = excluded.source_url,
      sort_order  = excluded.sort_order,
      updated_at  = excluded.updated_at
  `);

  const existingIds = new Set(
    (db.prepare('SELECT id FROM scenarios').all() as { id: string }[]).map((r) => r.id)
  );

  let inserted = 0;
  const tx = db.transaction((items: SeedScenario[]) => {
    for (const s of items) {
      if (!existingIds.has(s.id)) inserted++;
      upsert.run({
        id: s.id,
        category: s.category,
        scam_type: s.scam_type,
        title: s.title,
        description: s.description,
        icon: s.icon,
        difficulty: s.difficulty,
        steps_json: s.steps_json,
        source_url: s.source_url ?? null,
        sort_order: s.sort_order ?? 0,
        created_at: now,
        updated_at: now,
      });
    }
  });
  tx(scenarios);

  return { inserted, total: scenarios.length };
}
