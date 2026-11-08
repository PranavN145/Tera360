import { env } from '../config/env';

export class CaptchaVerificationError extends Error {
  statusCode: number;
  code: string;

  constructor(
    message = 'CAPTCHA verification failed',
    statusCode = 400,
    code = 'CAPTCHA_VERIFICATION_FAILED'
  ) {
    super(message);
    this.name = 'CaptchaVerificationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export interface TurnstileVerifyResult {
  success: boolean;
  challengeTs?: string;
  hostname?: string;
  errorCodes?: string[];
}

export class CaptchaService {
  private siteVerifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

  /**
   * Server-side verification of Cloudflare Turnstile token (PRD §13.1, §14.4, §18.2)
   */
  async verifyTurnstileToken(token: string, remoteIp?: string): Promise<TurnstileVerifyResult> {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new CaptchaVerificationError(
        'CAPTCHA verification token is required.',
        400,
        'CAPTCHA_TOKEN_REQUIRED'
      );
    }

    const trimmedToken = token.trim();

    // ── 1. Isolated Test Verifier (Restricted strictly to NODE_ENV === 'test') ──
    if (env.NODE_ENV === 'test') {
      if (
        trimmedToken === 'test-turnstile-token-valid' ||
        trimmedToken === '1x0000000000000000000000000000000AA'
      ) {
        return { success: true };
      }

      if (trimmedToken === 'test-turnstile-provider-failure') {
        throw new CaptchaVerificationError(
          'CAPTCHA verification service is currently unreachable. Please try again later.',
          503,
          'CAPTCHA_SERVICE_UNAVAILABLE'
        );
      }

      // Any other token in test environment is explicitly rejected
      throw new CaptchaVerificationError(
        'CAPTCHA verification failed. Token is invalid or has expired.',
        400,
        'CAPTCHA_VERIFICATION_FAILED'
      );
    }

    // ── 2. Production & Development Verification ──────────────────────
    const secretKey = env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

    if (!secretKey) {
      if (env.NODE_ENV === 'production') {
        // Fail closed in production when secret key is missing
        console.error('CRITICAL: CLOUDFLARE_TURNSTILE_SECRET_KEY is not configured in production.');
        throw new CaptchaVerificationError(
          'CAPTCHA verification is unavailable due to server misconfiguration.',
          503,
          'CAPTCHA_SERVICE_UNAVAILABLE'
        );
      }
    }

    // Use configured key, or Cloudflare's official dummy always-pass development secret
    const effectiveSecret = secretKey || '1x0000000000000000000000000000000AA';

    try {
      const formData = new URLSearchParams();
      formData.append('secret', effectiveSecret);
      formData.append('response', trimmedToken);
      if (remoteIp && remoteIp !== 'unknown') {
        formData.append('remoteip', remoteIp);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

      const response = await fetch(this.siteVerifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`Turnstile siteverify responded with HTTP status ${response.status}`);
        throw new CaptchaVerificationError(
          'CAPTCHA verification service returned an unexpected error. Please try again later.',
          503,
          'CAPTCHA_SERVICE_UNAVAILABLE'
        );
      }

      const data = (await response.json()) as any;

      if (!data.success) {
        const errorCodes = data['error-codes'] || [];
        console.warn('Turnstile verification rejected token with error codes:', errorCodes);
        throw new CaptchaVerificationError(
          'CAPTCHA verification failed. Token is invalid or has expired.',
          400,
          'CAPTCHA_VERIFICATION_FAILED'
        );
      }

      return {
        success: true,
        challengeTs: data.challenge_ts,
        hostname: data.hostname,
        errorCodes: data['error-codes'],
      };
    } catch (err: any) {
      if (err instanceof CaptchaVerificationError) {
        throw err;
      }
      console.error('Turnstile verification network/timeout error:', err.message);
      // Fail closed
      throw new CaptchaVerificationError(
        'CAPTCHA verification service is currently unreachable. Please try again later.',
        503,
        'CAPTCHA_SERVICE_UNAVAILABLE'
      );
    }
  }
}

export const captchaService = new CaptchaService();

