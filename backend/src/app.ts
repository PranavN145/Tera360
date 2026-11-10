import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { env } from './config/env';
import { mongoSanitize } from './middleware/mongoSanitize';
import { errorHandler } from './middleware/errorHandler';
import path from 'path';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/users.routes';
import publicRoutes from './modules/public/public.routes';
import reportRoutes from './modules/reports/report.routes';
import contactRoutes from './modules/contact/contact.routes';
import fieldOfficerRoutes from './modules/fieldOfficer/fieldOfficer.routes';
import alertRoutes from './modules/alerts/alert.routes';
import roadRoutes from './modules/roads/road.routes';
import officerRoutes from './modules/officer/officer.routes';
import villageRoutes from './modules/villages/village.routes';
import citizenRoutes from './modules/citizen/citizen.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import uploadRoutes from './modules/uploads/upload.routes';
import { roadController } from './modules/roads/road.controller';
import { reportController } from './modules/reports/report.controller';
import { requireAuth } from './middleware/requireAuth';
import { roleGuard } from './middleware/roleGuard';

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

// ── 1. Security & CORS Middlewares ───────────────────────────────────────────
// Helmet security headers
app.use(
  helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS allowlist (supports exact origins from CORS_ORIGINS/CLIENT_URL and Vercel deployments)
const allowedOrigins = env.CORS_ORIGINS.split(',').map((origin) => origin.trim());
if (env.CLIENT_URL && !allowedOrigins.includes(env.CLIENT_URL)) {
  allowedOrigins.push(env.CLIENT_URL.trim());
}
if (!allowedOrigins.includes('http://localhost:3000')) {
  allowedOrigins.push('http://localhost:3000');
}
if (!allowedOrigins.includes('http://127.0.0.1:3000')) {
  allowedOrigins.push('http://127.0.0.1:3000');
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
      'x-officer-id',
      'x-officer-sector',
    ],
  })
);

// ── 2. Health & Readiness probes (Excluded from rate limiters) ────────
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
  max: 100, // 100 requests per minute (PRD §13.1, AUD-15)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
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
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/roads', roadRoutes);
app.use('/api/v1/officer', officerRoutes);
app.use('/api/v1/villages', villageRoutes);
app.use('/api/v1/me', citizenRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/uploads', uploadRoutes);

// Safe alternative routes endpoint (PRD §14.4)
app.get('/api/v1/safe-routes', roadController.listSafeRoutes);
app.post('/api/v1/routes/safe', requireAuth, roadController.computeSafeRoute);

// Task assignment top-level route (PRD §14.4 POST /api/v1/tasks)
app.post('/api/v1/tasks', requireAuth, roleGuard('officer', 'admin'), reportController.assignTask);

// Canonical Field Officer routes mounted across legacy and versioned endpoints
app.use('/api/field-officer', fieldOfficerRoutes);
app.use('/api/v1/field-officer', fieldOfficerRoutes);
app.use('/api/v1/field', fieldOfficerRoutes);

// Static uploads serving with hardened security headers
app.use(
  '/uploads',
  express.static(path.resolve(process.cwd(), 'uploads'), {
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

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
