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

/**
 * 若 scenarios 表為空，則從 scripts/scenarios-seed.json 注入種子題庫。
 * 回傳注入筆數；已有資料則回 0。
 */
export async function seedIfEmpty(db: Database.Database): Promise<number> {
  const count = db.prepare('SELECT COUNT(*) AS n FROM scenarios').get() as { n: number };
  if (count.n > 0) return 0;

  const seedPath = findSeedPath();
  if (!seedPath) {
    console.warn('[seed] 找不到 scenarios-seed.json，跳過種子注入');
    return 0;
  }
  let raw: string;
  try {
    raw = readFileSync(seedPath, 'utf8');
  } catch {
    console.warn(`[seed] 讀取 ${seedPath} 失敗，跳過種子注入`);
    return 0;
  }

  const scenarios: SeedScenario[] = JSON.parse(raw);
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO scenarios
      (id, category, scam_type, title, description, icon, difficulty, steps_json, source_url, sort_order, created_at, updated_at)
    VALUES
      (@id, @category, @scam_type, @title, @description, @icon, @difficulty, @steps_json, @source_url, @sort_order, @created_at, @updated_at)
  `);

  const tx = db.transaction((items: SeedScenario[]) => {
    for (const s of items) {
      stmt.run({
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
  return scenarios.length;
}
