import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { requireAuth, type AuthedRequest } from '../utils/auth-guard.js';

const router = Router();

interface ClientResponse {
  stepIndex: number;
  choiceIndex: number;
  /** client 自報的正確性，伺服器不採信，會自行用 steps_json 重算。 */
  isCorrect?: boolean;
}

interface SubmitBody {
  scenarioId: string;
  startedAt: number;
  responses: ClientResponse[];
}

/** 解析過的單一步驟（含「正解 choice 的索引」）。 */
interface AnswerKeyStep {
  stepIndex: number;
  /** 正確選項的索引（一個步驟可能有多個正確選項，任一答對即視為正確）。 */
  correctIndices: number[];
}

/** 從 steps_json 建構 (stepIndex → 正解索引陣列) 的對照表。 */
function buildAnswerKey(stepsJson: string): AnswerKeyStep[] {
  const parsed = JSON.parse(stepsJson) as { steps: Array<{ stepIndex: number; choices: Array<{ correct: boolean }> }> };
  return parsed.steps.map((step) => ({
    stepIndex: step.stepIndex,
    correctIndices: step.choices
      .map((c, i) => (c.correct ? i : -1))
      .filter((i) => i >= 0),
  }));
}

/** 依答案鍵判定一筆作答是否正確。 */
function isResponseCorrect(key: AnswerKeyStep[], stepIndex: number, choiceIndex: number): boolean {
  const step = key.find((s) => s.stepIndex === stepIndex);
  return !!step && step.correctIndices.includes(choiceIndex);
}

/**
 * POST /api/attempts
 * 提交一次測驗結果（需登入）。
 *
 * 伺服器會從該情境的 steps_json 重建答案鍵，**忽略 client 傳的 isCorrect**
 * 並重新計算正確數與分數，避免被偽造。
 *
 * Body:
 *   { scenarioId, startedAt, responses: [{ stepIndex, choiceIndex }] }
 */
router.post('/', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const body = req.body as SubmitBody;

  if (!body?.scenarioId || !Array.isArray(body?.responses)) {
    return res.status(400).json({ error: '參數不足' });
  }

  // 取情境 + 答案鍵
  const scenario = db
    .prepare('SELECT id, steps_json FROM scenarios WHERE id = ?')
    .get(body.scenarioId) as { id: string; steps_json: string } | undefined;
  if (!scenario) return res.status(404).json({ error: '找不到情境' });

  let answerKey: AnswerKeyStep[];
  try {
    answerKey = buildAnswerKey(scenario.steps_json);
  } catch {
    return res.status(500).json({ error: '情境資料損毀' });
  }

  // 校驗每筆 response 的範圍合法性
  for (const r of body.responses) {
    const step = answerKey.find((s) => s.stepIndex === r.stepIndex);
    if (!step) {
      return res.status(400).json({ error: `stepIndex ${r.stepIndex} 不存在` });
    }
    if (!Number.isInteger(r.choiceIndex) || r.choiceIndex < 0) {
      return res.status(400).json({ error: `choiceIndex 不合法` });
    }
    // choiceIndex 上限於步驟選項數，由接下來的比對隱含處理（不存在即視為錯）
  }

  // 伺服器重算正確數（完全不採信 client 的 isCorrect）
  const total = body.responses.length;
  const evaluated = body.responses.map((r) => ({
    stepIndex: r.stepIndex,
    choiceIndex: r.choiceIndex,
    isCorrect: isResponseCorrect(answerKey, r.stepIndex, r.choiceIndex),
  }));
  const correct = evaluated.filter((r) => r.isCorrect).length;
  const score = total === 0 ? 0 : Math.round((correct / total) * 100);
  const now = Date.now();
  const attemptId = nanoid();

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO attempts (id, user_id, scenario_id, score, total_steps, correct_steps, started_at, completed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(attemptId, userId, body.scenarioId, score, total, correct, body.startedAt || now, now, now);

    const respStmt = db.prepare(
      `INSERT INTO step_responses (id, attempt_id, scenario_id, step_index, choice_index, is_correct, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const r of evaluated) {
      respStmt.run(nanoid(), attemptId, body.scenarioId, r.stepIndex, r.choiceIndex, r.isCorrect ? 1 : 0, now);
    }
  });

  try {
    tx();
  } catch (err) {
    console.error('[attempts] 寫入失敗:', err);
    return res.status(500).json({ error: '儲存失敗' });
  }

  res.json({
    attempt: {
      id: attemptId,
      score,
      totalSteps: total,
      correctSteps: correct,
      completedAt: now,
    },
  });
});

/**
 * GET /api/attempts/:id
 * 取回單次測驗的詳情（需登入，且只能看自己的 attempt）。
 *
 * 回傳分數 + 情境 metadata + 每題作答回顧（含正解）。
 */
router.get('/:id', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.id;

  const attempt = db
    .prepare(
      `SELECT a.id, a.user_id, a.scenario_id, a.score, a.total_steps, a.correct_steps,
              a.started_at, a.completed_at, a.created_at
       FROM attempts a WHERE a.id = ?`
    )
    .get(req.params.id) as
    | {
        id: string;
        user_id: string;
        scenario_id: string;
        score: number;
        total_steps: number;
        correct_steps: number;
        started_at: number;
        completed_at: number;
        created_at: number;
      }
    | undefined;

  if (!attempt) return res.status(404).json({ error: '找不到測驗紀錄' });
  if (attempt.user_id !== userId) return res.status(403).json({ error: '無權限檢視' });

  const scenario = db
    .prepare(
      `SELECT id, category, scam_type, title, description, icon, difficulty, source_url, steps_json
       FROM scenarios WHERE id = ?`
    )
    .get(attempt.scenario_id) as
    | {
        id: string;
        category: string;
        scam_type: string;
        title: string;
        description: string;
        icon: string;
        difficulty: number;
        source_url: string | null;
        steps_json: string;
      }
    | undefined;
  if (!scenario) return res.status(404).json({ error: '情境已不存在' });

  const responses = db
    .prepare(
      `SELECT step_index, choice_index, is_correct
       FROM step_responses WHERE attempt_id = ? ORDER BY step_index`
    )
    .all(req.params.id) as Array<{ step_index: number; choice_index: number; is_correct: number }>;

  // 把 steps_json 解析成可回傳給前端的 step 結構（含正解）
  const steps = (JSON.parse(scenario.steps_json) as { steps: Array<{
    stepIndex: number;
    uiType: string;
    scenario: string;
    dialogue: string;
    image: string | null;
    choices: Array<{ text: string; correct: boolean; explanation: string }>;
  }> }).steps;

  const review = steps.map((step) => {
    const resp = responses.find((r) => r.step_index === step.stepIndex);
    const selectedIndex = resp?.choice_index ?? null;
    const isCorrect = resp ? resp.is_correct === 1 : false;
    return {
      stepIndex: step.stepIndex,
      uiType: step.uiType,
      scenario: step.scenario,
      dialogue: step.dialogue,
      image: step.image,
      selectedIndex,
      isCorrect,
      choices: step.choices.map((c) => ({
        text: c.text,
        correct: c.correct,
        explanation: c.explanation,
      })),
    };
  });

  res.json({
    attempt: {
      id: attempt.id,
      score: attempt.score,
      totalSteps: attempt.total_steps,
      correctSteps: attempt.correct_steps,
      startedAt: attempt.started_at,
      completedAt: attempt.completed_at,
    },
    scenario: {
      id: scenario.id,
      category: scenario.category,
      scam_type: scenario.scam_type,
      title: scenario.title,
      description: scenario.description,
      icon: scenario.icon,
      difficulty: scenario.difficulty,
      source_url: scenario.source_url,
    },
    review,
  });
});

export default router;
