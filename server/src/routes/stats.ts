import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth, type AuthedRequest } from '../utils/auth-guard.js';

const router = Router();

/**
 * GET /api/stats/common-mistakes
 * 「最多人犯的錯」全站排行榜。
 * 計算每個 (scenario_id, step_index) 的錯誤率，回傳錯誤率最高的 Top N。
 *
 * query: ?category=sms_call&limit=10
 */
router.get('/common-mistakes', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const category = typeof req.query.category === 'string' ? req.query.category : null;

  let rows: any[];
  if (category) {
    rows = db
      .prepare(
        `SELECT r.scenario_id, r.step_index,
                s.title, s.icon, s.scam_type, s.category,
                COUNT(*)                     AS total_count,
                SUM(CASE WHEN r.is_correct = 0 THEN 1 ELSE 0 END) AS wrong_count,
                ROUND(100.0 * SUM(CASE WHEN r.is_correct = 0 THEN 1 ELSE 0 END) / COUNT(*), 1) AS wrong_rate
         FROM step_responses r
         JOIN scenarios s ON s.id = r.scenario_id
         WHERE s.category = ?
         GROUP BY r.scenario_id, r.step_index
         HAVING total_count >= 3
         ORDER BY wrong_rate DESC, wrong_count DESC
         LIMIT ?`
      )
      .all(category, limit);
  } else {
    rows = db
      .prepare(
        `SELECT r.scenario_id, r.step_index,
                s.title, s.icon, s.scam_type, s.category,
                COUNT(*)                     AS total_count,
                SUM(CASE WHEN r.is_correct = 0 THEN 1 ELSE 0 END) AS wrong_count,
                ROUND(100.0 * SUM(CASE WHEN r.is_correct = 0 THEN 1 ELSE 0 END) / COUNT(*), 1) AS wrong_rate
         FROM step_responses r
         JOIN scenarios s ON s.id = r.scenario_id
         GROUP BY r.scenario_id, r.step_index
         HAVING total_count >= 3
         ORDER BY wrong_rate DESC, wrong_count DESC
         LIMIT ?`
      )
      .all(limit);
  }

  res.json({ mistakes: rows });
});

/**
 * GET /api/stats/my-mistakes
 * 「我最常犯的錯」（需登入）。回傳該使用者錯誤率最高的題目。
 */
router.get('/my-mistakes', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const limit = Math.min(Number(req.query.limit) || 10, 50);

  const rows = db
    .prepare(
      `SELECT r.scenario_id, r.step_index,
              s.title, s.icon, s.scam_type, s.category,
              COUNT(*)                     AS total_count,
              SUM(CASE WHEN r.is_correct = 0 THEN 1 ELSE 0 END) AS wrong_count,
              ROUND(100.0 * SUM(CASE WHEN r.is_correct = 0 THEN 1 ELSE 0 END) / COUNT(*), 1) AS wrong_rate
       FROM step_responses r
       JOIN attempts a ON a.id = r.attempt_id
       JOIN scenarios s ON s.id = r.scenario_id
       WHERE a.user_id = ?
       GROUP BY r.scenario_id, r.step_index
       ORDER BY wrong_rate DESC, wrong_count DESC
       LIMIT ?`
    )
    .all(userId, limit);

  res.json({ mistakes: rows });
});

/**
 * GET /api/stats/overview
 * 全站總覽（總情境數、總作答數、平均分數等）。
 */
router.get('/overview', (_req, res) => {
  const scenarios = db.prepare('SELECT COUNT(*) AS n FROM scenarios').get() as { n: number };
  const attempts = db.prepare('SELECT COUNT(*) AS n FROM attempts').get() as { n: number };
  const responses = db.prepare('SELECT COUNT(*) AS n FROM step_responses').get() as { n: number };
  const avgScore = (db
    .prepare('SELECT AVG(score) AS avg FROM attempts')
    .get() as { avg: number | null }).avg;

  res.json({
    overview: {
      scenarioCount: scenarios.n,
      attemptCount: attempts.n,
      responseCount: responses.n,
      avgScore: avgScore ? Math.round(avgScore * 10) / 10 : 0,
    },
  });
});

export default router;
