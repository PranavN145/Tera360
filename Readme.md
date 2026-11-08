# Terra360 — Landslide Early-Warning & Public Safety Platform

> **Real-time geological hazard monitoring, early warning alerts, and citizen danger reporting for Northeast India.**

---

## 1. Project Overview

**Terra360** is an enterprise-grade landslide early-warning and community resilience platform engineered specifically for the vulnerable mountainous terrain of Northeast India (Assam, Meghalaya, Arunachal Pradesh, Sikkim, Nagaland, Manipur, Mizoram, Tripura).

The platform bridges real-time geological sensor analytics, public safety alerts, road accessibility tracking, and bi-directional community hazard reporting with zero-trust security and role-based operational portals.

---

## 2. Technology Stack & Architecture

| Tier | Technology | Hosting Target | Key Responsibilities |
| :--- | :--- | :--- | :--- |
| **Frontend** | Next.js 16.4 (App Router, Turbopack), React 19, Tailwind CSS v4, TypeScript | **Vercel** | Responsive public portal, live interactive risk map, citizen reporting forms, localized interfaces, authenticated account management. |
| **Backend API** | Node.js (v20+ LTS), Express 4, TypeScript, Zod, Helmet, Express-Rate-Limit | **Render** | Centralized REST API (`/api/v1`), JWT authentication, session tombstone rotation, Cloudflare Turnstile CAPTCHA verification, strict input validation, data sanitization. |
| **Database** | MongoDB Atlas, Mongoose 8 | **MongoDB Atlas** | Document store with compound indexes, Geospatial queries, session history, hazard reports, operational road alerts, and audit logs. |
| **Security** | Cloudflare Turnstile, Bcrypt, AES-256, Web Locks API | Cloudflare / Edge | Bot prevention, credential encryption, single-flight token serialization, token-reuse detection. |

---

## 3. Repository Structure

```
Tera360/
├── .gitignore                      # Root Git ignore rules (blocks secrets, node_modules, build outputs)
├── package.json                    # Workspace metadata
├── Readme.md                       # Repository onboarding guide & technical reference
├── PRD.md                          # Comprehensive Product Requirements Document (PRD)
├── data/
│   └── master_dataset.csv          # Geological landslide training dataset
├── backend/
│   ├── .env.example                # Safe backend environment template
│   ├── .gitignore                  # Backend-specific ignore rules
│   ├── README.md                   # Backend architecture documentation
│   ├── package.json                # Backend dependencies & operational scripts
│   ├── tsconfig.json               # Backend TypeScript configuration (ES2022 / CommonJS)
│   ├── postman/
│   │   ├── collection.json         # Automated API testing collection (Newman/Postman)
│   │   └── environment.json        # Postman local development environment variables
│   └── src/
│       ├── server.ts               # HTTP server bootstrap & graceful shutdown handlers
│       ├── app.ts                  # Express application, security middlewares, rate limiters
│       ├── config/                 # Zod environment validation & MongoDB connection
│       ├── middleware/             # requireAuth, roleGuard, validate, uploadGuard, errorHandler
│       ├── modules/
│       │   ├── auth/               # Register, login, refresh, logout, password recovery
│       │   ├── users/              # User profile, session listing/revocation, GDPR export, deletion
│       │   ├── public/             # Public GET APIs (risk-map, alerts, road-status, stats)
│       │   ├── reports/            # Public hazard reporting with CAPTCHA verification
│       │   ├── contact/            # Public inquiries & feedback endpoint
│       │   ├── alerts/             # Landslide alert models & schemas
│       │   └── roads/              # Road status & obstruction models
│       ├── scripts/                # Database seed, Postman generation, collection init
│       ├── services/               # CaptchaService (Turnstile), EmailService (Nodemailer)
│       ├── tests/                  # 12 automated verification test suites (250+ assertions)
│       └── utils/                  # JWT signing, SHA-256 token hashing, ownership assertors
└── frontend/
    ├── .env.example                # Safe frontend environment template
    ├── .gitignore                  # Frontend-specific ignore rules
    ├── next.config.ts              # Next.js configuration (Turbopack, cache components)
    ├── package.json                # Frontend dependencies & Next.js scripts
    ├── tsconfig.json               # Frontend TypeScript configuration
    ├── public/
    │   └── images/                 # Optimized brand assets, map backgrounds, UI graphics
    └── src/
        ├── app/                    # Next.js App Router (Public pages & Portal shells)
        ├── components/             # Reusable UI components (Hero, RiskMap, Modals, Layout)
        ├── context/                # Client state (AppContext, AuthContext)
        ├── lib/                    # Centralized API client (single-flight mutex, Web Locks)
        └── types/                  # TypeScript interface contracts for API & auth
```

---

## 4. Prerequisites

Before setting up the project locally, ensure you have:
- **Node.js**: `v20.x` or `v22.x` (Active LTS)
- **npm**: `v10.x` or higher
- **MongoDB**: A free cloud cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) OR local MongoDB `v7+`.
- **Git**: Installed and configured.

---

## 5. Quick-Start Local Development

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/terra360.git
cd terra360
```

### 2. Backend Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   npm install
   ```
2. Create your local environment configuration:
   ```bash
   cp .env.example .env
   ```
3. Open `backend/.env` in your editor and configure your variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection string (or local `mongodb://localhost:27017/terra360`).
   - `JWT_ACCESS_SECRET`: Generate a 64-char hex string: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `JWT_REFRESH_SECRET`: Generate a distinct 64-char hex string.
   - `ENCRYPTION_KEY`: Generate a 32-byte hex string (64 chars).
   - *(Optional)* `SMTP_*`: Configure SMTP for real emails, or leave blank to safely log verification links to the terminal.
4. Initialize database collections and indexes:
   ```bash
   npm run init:collections
   ```
5. *(Optional for local testing)* Seed demo accounts:
   ```bash
   npm run seed
   ```
6. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The backend will be running at `http://localhost:5000`.*
   *Verify liveness probe: `curl http://localhost:5000/health`*
   *Verify readiness probe: `curl http://localhost:5000/ready`*

---

### 3. Frontend Setup
1. In a second terminal, navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   ```
2. Create your local environment configuration:
   ```bash
   cp .env.example .env.local
   ```
3. Verify that `frontend/.env.local` points to your backend:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```
4. Start the frontend Next.js development server:
   ```bash
   npm run dev
   ```
   *The frontend application will be running at `http://localhost:3000`.*

---

## 6. Environment Variables Reference

> [!CAUTION]
> **NEVER commit `.env` or `.env.local` files to Git.** Real credentials, database passwords, and encryption keys must be kept locally or stored securely in deployment provider secret managers (Render Environment Variables / Vercel Environment Variables).

### Backend Variables (`backend/.env`)

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `NODE_ENV` | Application environment (`development`, `production`, `test`) | `development` |
| `PORT` | HTTP port Express binds to | `5000` |
| `MONGODB_URI` | MongoDB Atlas SRV connection string | `mongodb+srv://<user>:<pass>@cluster.mongodb.net/Terra360` |
| `JWT_ACCESS_SECRET` | Secret key for signing 15-minute access tokens (min 32 chars) | Random 64-char hex |
| `JWT_REFRESH_SECRET` | Secret key for signing 7-day refresh tokens (min 32 chars) | Random 64-char hex |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifespan | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifespan | `7d` |
| `CLIENT_URL` | Frontend origin for email links | `http://localhost:3000` |
| `CORS_ORIGINS` | Comma-separated list of allowed frontend origins | `http://localhost:3000` |
| `COOKIE_DOMAIN` | Domain attribute for refresh cookie (`localhost` or `.yourdomain.in`) | `localhost` |
| `COOKIE_SAMESITE` | Cookie SameSite mode (`strict` for local; `none` for cross-site cloud) | `strict` |
| `ENCRYPTION_KEY` | AES-256 key for sensitive payload fields | Random 64-char hex |
| `CLOUDFLARE_TURNSTILE_SECRET_KEY` | Secret key for Turnstile siteverify (PRD §13.1) | Cloudflare secret key |
| `TRUST_PROXY` | Reverse proxy trust topology (`loopback`, `1`, `false`, or CIDR) | `loopback` |
| `ALLOWED_PHOTO_DOMAINS` | Approved HTTPS domains for hazard photo attachments | `res.cloudinary.com,s3.amazonaws.com` |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Nodemailer SMTP configuration (optional in dev) | `smtp.example.com` |

### Frontend Variables (`frontend/.env.local`)

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Base URL of the backend REST API | `http://localhost:5000` |
| `NEXT_PUBLIC_DEV_CAPTCHA_TOKEN` | Optional development bypass token for testing report form | Blank in production |

---

## 7. Testing & Verification

The project includes over 250 automated tests covering unit models, public APIs, CAPTCHA verification, authentication flows, account management, and session lifecycle concurrency.

Run all tests from the `backend/` directory:

```bash
# 1. Full session lifecycle & tombstone audit (68 tests)
npx tsx src/tests/session-lifecycle.test.ts

# 2. Tombstone retention & concurrency audit (28 tests)
npx tsx src/tests/tombstone-concurrency-audit.test.ts

# 3. Frontend auth integration tests (52 tests)
npx tsx src/tests/frontend-auth-integration.test.ts

# 4. User account management integration tests (56 tests)
npx tsx src/tests/frontend-account-integration.test.ts

# 5. Account security audit (37 tests)
npx tsx src/tests/account-security-audit.test.ts

# 6. Edge-case verification tests (18 tests)
npx tsx src/tests/edge-case-verification.test.ts

# 7. Type-check backend & frontend
npm run type-check --prefix backend
npx tsc -p frontend --noEmit
```

---

## 8. API Catalog & Health Probes

### Operational Probes
- `GET /health` — Lightweight process liveness check (HTTP 200). Excluded from rate limiters.
- `GET /ready` — Readiness check verifying MongoDB connectivity (HTTP 200 when connected, 503 when disconnected).

### Public Endpoints (`/api/v1/public`)
- `GET /api/v1/public/risk-map` — Aggregated geological landslide risk zones by state and district.
- `GET /api/v1/public/alerts` — Real-time active weather, rainfall, and hazard warnings with severity filters.
- `GET /api/v1/public/road-status` — Northeast highway passability, blockages, and detours.
- `GET /api/v1/public/stats` — High-level statistics (monitored highways, active alerts, safe routes).

### Hazard Reporting & Inquiries
- `POST /api/v1/reports/public` — Citizen danger report submission (requires Cloudflare Turnstile CAPTCHA).
- `POST /api/v1/contact` — Community feedback and inquiry form submission (rate-limited).

### Authentication & Account Management (`/api/v1/auth`, `/api/v1/users`)
- `POST /api/v1/auth/register` — Citizen and driver self-registration.
- `POST /api/v1/auth/login` — Authentication with account lockout protection.
- `POST /api/v1/auth/refresh` — Atomic single-use token rotation with tombstone reuse detection.
- `POST /api/v1/auth/logout` — Revokes current session and clears refresh cookie.
- `POST /api/v1/auth/forgot-password` & `POST /api/v1/auth/reset-password` — Secure password recovery.
- `GET /api/v1/users/me` & `PATCH /api/v1/users/me` — Authenticated profile view and update.
- `GET /api/v1/users/me/sessions` & `DELETE /api/v1/users/me/sessions/:id` — Active session inspection and remote revocation.
- `GET /api/v1/users/me/export` — Personal data archive export (GDPR / Indian DPDP Act compliant).
- `DELETE /api/v1/users/me` — Permanent account and personal data deactivation.

---

## 9. Security Architecture & Deployment Notes

### Session Tombstone Architecture (Phase 3.7 & 3.7.1)
- Tokens are never stored in plaintext (SHA-256 hashed).
- Sessions transition through three explicit lifecycle states: `active`, `rotated`, and `revoked`.
- Presenting an unexpired `rotated` token triggers `TOKEN_REUSE_DETECTED` and immediately revokes all active sessions for that account.
- Presenting a `revoked` token (e.g. from password change or remote device revocation) returns `401 SESSION_REVOKED` without affecting other active devices.
- Unexpired rotated tombstones are strictly preserved for their full 7-day TTL to guarantee reuse detection.

### Cross-Site Deployment Strategy (Vercel + Render)
When deploying the frontend to Vercel and the backend to Render under default cloud provider domains:
- **Domains**: `terra360.vercel.app` and `terra360-api.onrender.com` are cross-site.
- **Cookie SameSite**: The backend must be configured with `COOKIE_SAMESITE=none` and `Secure=true`.
- **CORS**: `CORS_ORIGINS` on Render must include `https://terra360.vercel.app`.
- **Custom Apex Domain (Recommended Alternative)**: If using a shared custom domain (e.g. `app.terra360.in` for Vercel and `api.terra360.in` for Render), configure `COOKIE_DOMAIN=.terra360.in` and `COOKIE_SAMESITE=lax`.

---

## 10. Implementation Status & Upcoming Portals

- [x] **Milestone M1**: Authentication, RBAC schemas, and JWT rotation.
- [x] **Milestone M2**: Public GET APIs, Database models, and Seed data.
- [x] **Milestone M2.4 & M2.5**: Cloudflare Turnstile integration, trusted proxy security, rate limiting.
- [x] **Milestone M3.1 – M3.3**: Frontend integration for Public Risk Map, Alerts, Road Status, Report Danger, and Contact.
- [x] **Milestone M3.4 – M3.6**: Frontend authentication integration, user account settings, session manager, personal data export.
- [x] **Milestone M3.7 & M3.7.1**: Session tombstone architecture, replay prevention, and concurrency security.
- [ ] **Upcoming Milestone M4**: Dedicated operational portals for:
  - **Citizen Portal** (`/citizen/home`, `/citizen/profile`)
  - **Driver Portal** (`/driver/route-check`)
  - **Field Officer Portal** (`/field/tasks`)
  - **Emergency Officer Dashboard** (`/officer/dashboard`)
  - **System Admin Console** (`/admin/users`)
