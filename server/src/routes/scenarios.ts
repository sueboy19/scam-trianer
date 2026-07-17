import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

/**
 * GET /api/scenarios
 * 列出所有情境（不含完整 steps_json，僅 metadata）。
 * query: ?category=sms_call|crypto_emerging|social_media
 */
router.get('/', (req, res) => {
  const { category } = req.query;
  let rows: any[];
  if (category && typeof category === 'string') {
    rows = db
      .prepare(
        `SELECT id, category, scam_type, title, description, icon, difficulty, source_url, sort_order
         FROM scenarios WHERE category = ? ORDER BY sort_order, created_at`
      )
      .all(category);
  } else {
    rows = db
      .prepare(
        `SELECT id, category, scam_type, title, description, icon, difficulty, source_url, sort_order
         FROM scenarios ORDER BY sort_order, created_at`
      )
      .all();
  }
  res.json({ scenarios: rows });
});

/**
 * GET /api/scenarios/:id
 * 取得單一情境完整內容（含 steps_json）。
 */
router.get('/:id', (req, res) => {
  const row = db
    .prepare(
      `SELECT id, category, scam_type, title, description, icon, difficulty, steps_json, source_url
       FROM scenarios WHERE id = ?`
    )
    .get(req.params.id) as any;

  if (!row) return res.status(404).json({ error: '找不到情境' });

  // steps_json 是字串化的 { steps: [...] }，回傳時取出陣列
  row.steps = (JSON.parse(row.steps_json) as { steps: unknown[] }).steps;
  delete row.steps_json;
  res.json({ scenario: row });
});

export default router;
