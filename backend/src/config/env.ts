import path from 'path';
import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env relative to backend root, or from process.cwd() fallback
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export const portSchema = z
  .preprocess((val) => {
    if (val === undefined || val === null) return 5000;
    if (typeof val === 'string' && val.trim() === '') return 5000;
    return val;
  }, z.coerce.number().int().min(1).max(65535))
  .default(5000);

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: portSchema,
  MONGODB_URI: z.string().min(1).default('mongodb://localhost:27017/terra360'),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters')
    .default('terra360_dev_jwt_access_secret_min_32_chars_0123456789abcdef'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters')
    .default('terra360_dev_jwt_refresh_secret_min_32_chars_fedcba9876543210'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: z.string().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  COOKIE_DOMAIN: z.string().default('localhost'),
  COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('none'),
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_KEY must be a 64-character hexadecimal string')
    .default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@terra360.example'),
  CLOUDFLARE_TURNSTILE_SECRET_KEY: z.string().optional(),
  TRUST_PROXY: z.string().default('loopback'),
  ALLOWED_PHOTO_DOMAINS: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

// Strict safeguards for production deployment
if (parsed.data.NODE_ENV === 'production') {
  const errors: string[] = [];

  if (
    parsed.data.JWT_ACCESS_SECRET.includes('dev_') ||
    parsed.data.JWT_REFRESH_SECRET.includes('dev_')
  ) {
    errors.push('Production requires unique, cryptographically random JWT secrets (cannot contain "dev_").');
  }

  if (
    parsed.data.ENCRYPTION_KEY ===
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  ) {
    errors.push('Production requires a unique, secure ENCRYPTION_KEY (cannot use default placeholder).');
  }

  if (
    parsed.data.MONGODB_URI.includes('localhost') ||
    parsed.data.MONGODB_URI.includes('127.0.0.1')
  ) {
    errors.push('Production cannot use a localhost MONGODB_URI. Provide a secure MongoDB Atlas connection string.');
  }

  const origins = parsed.data.CORS_ORIGINS.split(',').map((s) => s.trim());
  if (origins.includes('*')) {
    errors.push('Wildcard CORS origins (*) are strictly forbidden in production when credentials are enabled.');
  }

  if (errors.length > 0) {
    console.error('\n❌ CRITICAL: Production Environment Configuration Incomplete:');
    errors.forEach((err) => console.error(`   • ${err}`));
    console.error('\nPlease configure valid production environment variables before deploying.\n');
    process.exit(1);
  }
}

export const env = parsed.data;

