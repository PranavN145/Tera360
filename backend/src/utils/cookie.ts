import { Request, Response, CookieOptions } from 'express';
import { env } from '../config/env';

export const REFRESH_COOKIE_NAME = 'refreshToken';

export function getRefreshTokenCookieOptions(): CookieOptions {
  // SameSite=none requires secure=true in all modern browsers (RFC 6265bis)
  const sameSite = env.COOKIE_SAMESITE as 'strict' | 'lax' | 'none';
  const isSecure = sameSite === 'none' || env.NODE_ENV === 'production';

  // In cross-origin deployments (e.g. Render backend + Vercel frontend),
  // omit domain attribute (undefined) for public suffixes (onrender.com, vercel.app)
  // so the browser sets a Host-Only cookie rather than rejecting it under PSL rules.
  let domain: string | undefined = undefined;
  if (env.COOKIE_DOMAIN && env.COOKIE_DOMAIN !== 'localhost') {
    const d = env.COOKIE_DOMAIN.toLowerCase().trim();
    if (!d.endsWith('onrender.com') && !d.endsWith('vercel.app')) {
      domain = env.COOKIE_DOMAIN;
    }
  }

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite,
    domain,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

export function setRefreshTokenCookie(res: Response, token: string): void {
  const options = getRefreshTokenCookieOptions();
  res.cookie(REFRESH_COOKIE_NAME, token, options);
}

export function clearRefreshTokenCookie(res: Response): void {
  const options = { ...getRefreshTokenCookieOptions() };
  delete options.maxAge;
  // Clear current root path
  res.clearCookie(REFRESH_COOKIE_NAME, options);
  // Clear legacy auth path if present
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...options,
    path: '/api/v1/auth',
  });
}

/**
 * Extracts the valid non-empty refresh token from incoming cookies.
 * Handles cases where multiple cookies exist due to differing cookie paths.
 */
export function getRefreshTokenFromRequest(req: Request): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const pairs = cookieHeader.split(';').map((c) => c.trim());
    const candidates = pairs
      .filter((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`))
      .map((c) => c.substring(REFRESH_COOKIE_NAME.length + 1).trim())
      .filter((val) => val.length > 0);

    if (candidates.length > 0) {
      // Return the candidate with highest length (valid JWT vs empty/dummy token)
      return candidates.sort((a, b) => b.length - a.length)[0];
    }
  }

  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  return token && typeof token === 'string' && token.trim().length > 0 ? token.trim() : undefined;
}
