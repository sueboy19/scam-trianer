/**
 * 業務表格 schema（內嵌字串，避免 build 後檔案路徑依賴）。
 * 全部使用 IF NOT EXISTS，可重複執行。
 *
 * 注意：user / account / session / verification 四張表由 Better Auth 自動建立。
 */
export const SCHEMA_SQL = `
-- 詐騙情境題庫
CREATE TABLE IF NOT EXISTS scenarios (
  id            TEXT PRIMARY KEY,
  category      TEXT NOT NULL,
  scam_type     TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  icon          TEXT,
  difficulty    INTEGER NOT NULL DEFAULT 1,
  steps_json    TEXT NOT NULL,
  source_url    TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scenarios_category ON scenarios(category);

-- 測驗記錄（一次完整測驗 = 一筆）
CREATE TABLE IF NOT EXISTS attempts (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  scenario_id   TEXT NOT NULL REFERENCES scenarios(id),
  score         INTEGER NOT NULL,
  total_steps   INTEGER NOT NULL,
  correct_steps INTEGER NOT NULL,
  started_at    INTEGER NOT NULL,
  completed_at  INTEGER NOT NULL,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_scenario ON attempts(scenario_id);

-- 每題作答明細（用於「最多人犯的錯」統計）
CREATE TABLE IF NOT EXISTS step_responses (
  id            TEXT PRIMARY KEY,
  attempt_id    TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  scenario_id   TEXT NOT NULL,
  step_index    INTEGER NOT NULL,
  choice_index  INTEGER NOT NULL,
  is_correct    INTEGER NOT NULL,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_responses_scenario_step ON step_responses(scenario_id, step_index);
CREATE INDEX IF NOT EXISTS idx_responses_attempt ON step_responses(attempt_id);
`;
