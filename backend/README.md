# Terra360 Backend API

Landslide Early-Warning Backend API for Northeast India (Node.js, Express, TypeScript, MongoDB, Mongoose).

## Features Implemented (Milestone M1: Authentication & Roles)

1. **Strict TypeScript & Zod Environment Validation**: Validates all configuration variables at boot before service initialization.
2. **MongoDB Connection & Graceful Shutdown**: Handles process signals (`SIGINT`, `SIGTERM`), disconnecting database and closing socket pools gracefully.
3. **Probes**:
   - `GET /health` — Liveness check (instant 200 without DB dependency).
   - `GET /ready` — Readiness check (returns 200 when MongoDB is connected, 503 when disconnected).
4. **Security Middleware**:
   - `helmet` security headers.
   - Explicit `cors` allowlist with credentials support.
   - `cookie-parser` for secure HttpOnly cookie handling.
   - Strict `10kb` body size limit on authentication routes.
   - MongoDB operator sanitization against NoSQL injection.
   - Strict rate limiting on authentication routes (15 req/min per IP).
5. **User Model**:
   - Enforces unique lowercased emails, bcrypt password hashing (cost 10), role-based permissions (`citizen`, `driver`, `field_officer`, `officer`, `admin`).
   - Failed login tracking and automatic account lockout after 5 consecutive failures for 15 minutes.
   - Session storage with SHA-256 hashed refresh tokens.
6. **Authentication & Session Management**:
   - **Registration**: Strictly allows self-registration for `citizen` and `driver` only. Blocks attempts to register as staff roles (`officer`, `field_officer`, `admin`).
   - **Login**: Email + password with generic error messages preventing enumeration.
   - **Access Token**: Short-lived JWT (15 minutes) passed in `Authorization: Bearer <token>`.
   - **Refresh Token**: 7-day token stored hashed in MongoDB and issued via `HttpOnly`, `SameSite=Strict`, `Secure` cookie.
   - **Token Rotation & Theft Detection**: On every refresh, old token is invalidated and rotated. If an already-rotated token is presented, all active sessions for that user are immediately revoked.
   - **Email Verification & Password Reset**: Single-use, hashed SHA-256 tokens with short expiration windows (24 hours for email verification, 1 hour for password reset).
   - **Safe Development Mode**: When running locally without SMTP credentials, verification and reset links are safely output to the console for testing.

---

## Directory Structure

```
backend/
├── src/
│   ├── server.ts                    # Entry point: DB connect → listen
│   ├── app.ts                       # Express application: middlewares & route mounts
│   ├── config/
│   │   ├── env.ts                   # Zod validated configuration
│   │   └── db.ts                    # Mongoose connection & lifecycle
│   ├── middleware/
│   │   ├── requireAuth.ts           # JWT authentication guard
│   │   ├── roleGuard.ts             # Role-based access control
│   │   ├── validate.ts              # Zod schema validation factory
│   │   ├── uploadGuard.ts           # Media payload & type guard
│   │   ├── mongoSanitize.ts         # NoSQL injection protection
│   │   └── errorHandler.ts          # Centralized error handler
│   ├── modules/
│   │   ├── auth/                    # routes, controller, service, schema
│   │   └── users/                   # user model, controller, service, schema
│   ├── services/
│   │   └── email.service.ts         # Nodemailer & dev email logger
│   ├── utils/
│   │   ├── jwt.ts                   # JWT sign/verify
│   │   ├── crypto.ts                # Token hashing (SHA-256)
│   │   ├── tokenCompare.ts          # Constant-time comparison
│   │   └── ownershipCheck.ts        # 404 ownership assertor
│   ├── types/
│   │   └── express.d.ts             # Express Request augmentation (req.user)
│   └── tests/
│       └── auth.test.ts             # 31 unit & integration tests
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

---

## Getting Started

### 1. Prerequisites
- Node.js 20+ (Active LTS)
- MongoDB instance (Local or Atlas)

### 2. Environment Configuration
Copy the example environment file and update your variables:
```bash
cp .env.example .env
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Tests
```bash
npm test
```

### 5. Type-Check & Build
```bash
npm run type-check
npm run build
```

### 6. Start Development Server
```bash
npm run dev
```

---

## Endpoints Catalog (`/api/v1`)

| Method | Path | Auth | Roles Allowed | Description |
|---|---|---|---|---|
| `GET` | `/health` | No | Public | Liveness probe (process up) |
| `GET` | `/ready` | No | Public | Readiness probe (MongoDB connected) |
| `POST` | `/api/v1/auth/register` | No | Public | Citizen / driver self-registration |
| `POST` | `/api/v1/auth/login` | No | Public | Email + password login, issues access token & refresh cookie |
| `POST` | `/api/v1/auth/refresh` | Cookie | Public | Rotates refresh token, issues new access token |
| `POST` | `/api/v1/auth/logout` | Optional | Any | Clears refresh cookie & revokes session in DB |
| `POST` | `/api/v1/auth/verify-email` | No | Public | Verifies email using hashed single-use token |
| `POST` | `/api/v1/auth/forgot-password`| No | Public | Initiates password reset (generic response) |
| `POST` | `/api/v1/auth/reset-password` | No | Public | Resets password with token & revokes all sessions |
| `GET` | `/api/v1/users/me` | Bearer | Any authenticated | Returns current user profile |
| `PATCH`| `/api/v1/users/me` | Bearer | Any authenticated | Updates name, phone, language |
| `GET` | `/api/v1/users/me/sessions` | Bearer | Any authenticated | Lists user's active session devices |
| `DELETE`| `/api/v1/users/me/sessions/:id` | Bearer | Any authenticated | Revokes a specific session |

