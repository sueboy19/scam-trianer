import type { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../auth/auth.js';

export interface AuthedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string | null;
    image: string | null;
  };
  session?: unknown;
}

/**
 * 驗證登入狀態的 middleware。
 * 從 cookie 取得 session，未登入回 401。
 * 登入則把 user 掛到 req.user。
 */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session) {
      return res.status(401).json({ error: '未登入' });
    }
    req.user = session.user as AuthedRequest['user'];
    req.session = session.session;
    next();
  } catch (err) {
    console.error('[requireAuth] 取得 session 失敗:', err);
    return res.status(401).json({ error: '驗證失敗' });
  }
}

/**
 * 可選登入：登入就帶 user，沒登入也放行（給「未登入可體驗」的功能用）。
 */
export async function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (session) {
      req.user = session.user as AuthedRequest['user'];
      req.session = session.session;
    }
  } catch {
    // 忽略，視為未登入
  }
  next();
}
