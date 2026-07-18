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

/** 決定手機內 APP 圖示與介面風格。 */
export type AppName =
  | 'phone'      // 來電
  | 'sms'        // 簡訊
  | 'line'       // LINE 聊天
  | 'ig'         // Instagram DM
  | 'fb'         // Facebook
  | 'telegram'   // Telegram
  | 'twitter'    // Twitter / X 私訊
  | 'email';     // 信箱

export interface Step {
  stepIndex: number;
  uiType: 'phone_call' | 'message' | 'email' | 'chat' | 'social_post';
  scenario: string;
  dialogue: string;
  image: string | null;
  choices: Choice[];
  // ↓ 沉浸式模擬用（皆為選填，未提供時走智慧預設）↓
  /** 寄件者 / 來電者顯示名稱。 */
  sender?: string;
  /** 來電號碼或帳號（如 +886-2-2345-6789）。 */
  phone?: string;
  /** APP 圖示與介面風格；未指定時依 uiType 自動推斷。 */
  appName?: AppName;
  /** emoji 大頭貼；未指定時依 appName 預設。 */
  avatar?: string;
  /** 顯示時間（如「剛剛」「14:32」）。 */
  timestamp?: string;
  /** Email 主旨（僅 email 介面用）。 */
  subject?: string;
  /** 貼文圖片 emoji（社群貼文用）。 */
  postImage?: string;
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
