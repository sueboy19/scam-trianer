// API 封裝：所有 fetch 都帶 credentials（cookie session）
// 開發期 Vite proxy 把 /api 代理到 Express；正式期同源。

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = body.error || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
};

// ===== 型別 =====
export interface ScenarioSummary {
  id: string;
  category: 'sms_call' | 'crypto_emerging' | 'social_media';
  scam_type: string;
  title: string;
  description: string;
  icon: string;
  difficulty: number;
  source_url: string | null;
  sort_order: number;
}

export interface Choice {
  text: string;
  correct: boolean;
  explanation: string;
}

export interface Step {
  stepIndex: number;
  uiType: 'phone_call' | 'message' | 'email' | 'chat' | 'social_post';
  scenario: string;
  dialogue: string;
  image: string | null;
  choices: Choice[];
}

export interface ScenarioDetail extends ScenarioSummary {
  steps: Step[];
}

export interface AttemptResult {
  attempt: {
    id: string;
    score: number;
    totalSteps: number;
    correctSteps: number;
    completedAt: number;
  };
}

/** GET /api/attempts/:id 回傳的「單次測驗詳情」（含每題回顧）。 */
export interface AttemptDetail {
  attempt: {
    id: string;
    score: number;
    totalSteps: number;
    correctSteps: number;
    startedAt: number;
    completedAt: number;
  };
  scenario: {
    id: string;
    category: 'sms_call' | 'crypto_emerging' | 'social_media';
    scam_type: string;
    title: string;
    description: string;
    icon: string;
    difficulty: number;
    source_url: string | null;
  };
  review: Array<{
    stepIndex: number;
    uiType: Step['uiType'];
    scenario: string;
    dialogue: string;
    image: string | null;
    selectedIndex: number | null;
    isCorrect: boolean;
    choices: Choice[];
  }>;
}
