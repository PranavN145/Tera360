import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { env } from './config/env';
import { mongoSanitize } from './middleware/mongoSanitize';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/users.routes';
import publicRoutes from './modules/public/public.routes';
import reportRoutes from './modules/reports/report.routes';
import contactRoutes from './modules/contact/contact.routes';

const app: Express = express();

// Configure trusted reverse proxies according to deployment topology (PRD §13.1, §15)
const resolveTrustProxy = (configVal: string | undefined): boolean | number | string => {
  const val = configVal?.trim().toLowerCase();
  if (!val || val === 'false' || val === '0') return false;
  if (val === 'true') return true;
  if (/^\d+$/.test(val)) return parseInt(val, 10);
  return configVal!.trim();
};

app.set('trust proxy', resolveTrustProxy(env.TRUST_PROXY));

// ── 1. Health & Readiness probes (Excluded from rate limiters) ────────
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/ready', (_req: Request, res: Response) => {
  const isDbReady = mongoose.connection.readyState === 1;
  if (isDbReady) {
    res.status(200).json({
      success: true,
      status: 'ready',
      database: 'connected',
      databaseName: mongoose.connection.name,
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      success: false,
      status: 'not_ready',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// ── 2. Security Middlewares ───────────────────────────────────────────
// Helmet security headers
app.use(
  helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS allowlist (supports exact origins from CORS_ORIGINS/CLIENT_URL and Vercel deployments)
const allowedOrigins = env.CORS_ORIGINS.split(',').map((origin) => origin.trim());
if (env.CLIENT_URL && !allowedOrigins.includes(env.CLIENT_URL)) {
  allowedOrigins.push(env.CLIENT_URL.trim());
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*') ||
        /^https:\/\/.*\.vercel\.app$/.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error(`Origin '${origin}' not permitted by CORS policy`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'x-refresh-token',
      'X-Refresh-Token',
    ],
  })
);

// Cookie Parser
app.use(cookieParser());

// Request Body Parser with Strict 10kb Size Limit (PRD §13.1)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Mongo Sanitization against NoSQL injection
app.use(mongoSanitize);

// ── 3. Global Rate Limiter ────────────────────────────────────────────
const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 150, // 150 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests. Please slow down.',
    },
  },
});
app.use('/api', globalApiLimiter);

// ── 4. API Routes ─────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/contact', contactRoutes);

// ── 5. 404 Route Handler ──────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Endpoint '${req.method} ${req.originalUrl}' does not exist on this server.`,
    },
  });
});

// ── 6. Central Error Handler (Always last) ─────────────────────────────
app.use(errorHandler);

export default app;
