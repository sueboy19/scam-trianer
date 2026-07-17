import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth, type AuthedRequest } from '../utils/auth-guard.js';

const router = Router();

/**
 * GET /api/history
 * 個人測驗歷史（需登入）。
 * query: ?limit=20
 */
router.get('/', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const rows = db
    .prepare(
      `SELECT a.id, a.scenario_id, s.title, s.icon, s.scam_type, s.category,
              a.score, a.total_steps, a.correct_steps, a.started_at, a.completed_at, a.created_at
       FROM attempts a
       JOIN scenarios s ON s.id = a.scenario_id
       WHERE a.user_id = ?
       ORDER BY a.created_at DESC
       LIMIT ?`
    )
    .all(userId, limit);

  // 個人最佳成績（每個情境）
  const best = db
    .prepare(
      `SELECT scenario_id, MAX(score) AS best_score, COUNT(*) AS attempts_count
       FROM attempts WHERE user_id = ?
       GROUP BY scenario_id`
    )
    .all(userId);

  res.json({ history: rows, best: best });
});

export default router;
