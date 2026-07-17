import { createAuthClient } from 'better-auth/client';

/**
 * Better Auth 客戶端。
 * baseURL 指向 Express（開發期 Vite proxy 代理 /api/auth → :3000）。
 */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || window.location.origin,
});

export type SocialProvider = 'google' | 'facebook' | 'line' | 'instagram';

/** 觸發社群登入（後端 redirect flow） */
export function signInWith(provider: SocialProvider) {
  return authClient.signIn.social({
    provider,
    callbackURL: window.location.origin + '/',
  });
}

/** 登出 */
export async function signOut() {
  await authClient.signOut();
}
