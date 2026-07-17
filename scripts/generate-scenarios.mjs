#!/usr/bin/env node
/**
 * 離線題庫生成腳本（骨架）。
 *
 * 用途：未來串接 LLM（如 OpenAI / Claude / GLM API）自動產出符合
 *       scenarios-seed.json schema 的多步驟情境題，擴充題庫。
 *
 * 目前：提供「題目範本驗證」功能 —— 讀入一個手寫的草稿 JSON，
 *       檢查 schema 正確性後輸出到 stdout，方便手動加入 seed 檔。
 *
 * 使用：
 *   node scripts/generate-scenarios.mjs scripts/draft.json
 *   node scripts/generate-scenarios.mjs --validate scripts/scenarios-seed.json
 */

import { readFileSync } from 'node:fs';
import { argv, exit } from 'node:process';

const VALID_CATEGORIES = ['sms_call', 'crypto_emerging', 'social_media'];
const VALID_UI_TYPES = ['phone_call', 'message', 'email', 'chat', 'social_post'];

function validateScenario(s, idx) {
  const errs = [];
  if (!s.id) errs.push('缺 id');
  if (!VALID_CATEGORIES.includes(s.category)) errs.push(`category 需為 ${VALID_CATEGORIES.join('/')}`);
  if (!s.scam_type) errs.push('缺 scam_type');
  if (!s.title) errs.push('缺 title');
  if (typeof s.difficulty !== 'number' || s.difficulty < 1 || s.difficulty > 3) errs.push('difficulty 需 1-3');
  if (!s.icon) errs.push('缺 icon');

  let steps;
  try {
    steps = typeof s.steps_json === 'string' ? JSON.parse(s.steps_json).steps : s.steps_json?.steps;
  } catch {
    errs.push('steps_json 不是合法 JSON');
    return errs;
  }
  if (!Array.isArray(steps) || steps.length === 0) {
    errs.push('steps 至少需 1 步');
    return errs;
  }

  steps.forEach((step, i) => {
    if (!VALID_UI_TYPES.includes(step.uiType)) errs.push(`step[${i}].uiType 需為 ${VALID_UI_TYPES.join('/')}`);
    if (!Array.isArray(step.choices) || step.choices.length < 2) errs.push(`step[${i}].choices 至少 2 個`);
    const hasCorrect = step.choices?.some((c) => c.correct);
    if (!hasCorrect) errs.push(`step[${i}] 至少需 1 個 correct:true 的選項`);
    step.choices?.forEach((c, ci) => {
      if (typeof c.correct !== 'boolean') errs.push(`step[${i}].choices[${ci}].correct 需為 boolean`);
      if (!c.explanation) errs.push(`step[${i}].choices[${ci}] 缺 explanation`);
    });
  });

  return errs;
}

function main() {
  const args = argv.slice(2);
  if (args.length === 0) {
    console.error('用法: node scripts/generate-scenarios.mjs <file.json> | --validate <file.json>');
    exit(1);
  }

  const validateOnly = args[0] === '--validate';
  const file = validateOnly ? args[1] : args[0];
  if (!file) {
    console.error('需指定檔案');
    exit(1);
  }

  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`讀取 ${file} 失敗: ${e.message}`);
    exit(1);
  }

  const scenarios = Array.isArray(data) ? data : [data];
  let allOk = true;

  scenarios.forEach((s, i) => {
    const errs = validateScenario(s, i);
    if (errs.length) {
      allOk = false;
      console.error(`❌ [${i}] ${s.id || '(no id)'}:`);
      errs.forEach((e) => console.error(`   - ${e}`));
    } else {
      console.log(`✅ [${i}] ${s.id} 通過 (${JSON.parse(s.steps_json || JSON.stringify({ steps: s.steps })).steps.length} 步)`);
    }
  });

  if (!allOk) {
    console.error('\n有錯誤，請修正');
    exit(1);
  }

  if (!validateOnly) {
    // 輸出整理後的 JSON（可手動併入 seed）
    console.log('\n=== 輸出（可併入 scenarios-seed.json）===');
    console.log(JSON.stringify(scenarios, null, 2));
  }
}

main();
