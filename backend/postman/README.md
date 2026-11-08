# Terra360 API — Postman Test Collection & Environment Guide

This folder contains the complete, automated Postman collection and environment configuration for the Terra360 early-warning platform backend.

---

## 📁 Files

- `collection.json`: Postman Collection (v2.1.0 schema) containing **34 automated test requests** across 5 functional folders.
- `environment.json`: Postman Environment containing variables, base URL, auth token placeholders, and test credentials.

---

## 🚀 Quick Start Instructions

### Option 1: Run via Command Line (Newman)

Ensure the backend server is running (`npm run dev --prefix backend` or `npm start --prefix backend` on port 5000):

```bash
# Run all 31 requests with 67 assertions
npx newman run backend/postman/collection.json -e backend/postman/environment.json
```

Or using the npm script from the `backend` directory:

```bash
cd backend
npm run test:postman
```

---

### Option 2: Import into Postman Desktop Application

1. **Open Postman**.
2. Click **Import** (top left).
3. Drag & drop or select both:
   - `backend/postman/collection.json`
   - `backend/postman/environment.json`
4. In the top-right environment dropdown, select **Terra360 Local Development**.
5. To execute all requests sequentially:
   - Click the collection name: **Terra360 API - Phase 2 Verification**.
   - Click **Run Collection**.
   - Click **Run Terra360 API - Phase 2 Verification**.

---

## 📋 Collection Structure & Test Coverage

### 1. Health & Probes (`01. Health & Probes`)
| Request | Method | Endpoint | Verifications |
| :--- | :---: | :--- | :--- |
| **GET Health Check** | `GET` | `/health` | Status 200, `status === 'healthy'`, uptime > 0, timestamp valid ISO |
| **GET Readiness Check** | `GET` | `/ready` | Status 200, `status === 'ready'`, `database === 'connected'`, `databaseName === 'Terra360'` |

---

### 2. Authentication & Sessions (`02. Authentication & Sessions`)
| Request | Method | Endpoint | Verifications |
| :--- | :---: | :--- | :--- |
| **POST Register (Citizen - Success)** | `POST` | `/api/v1/auth/register` | Status 201, `data.user.role === 'citizen'`, dynamic timestamp email, passwordHash never exposed |
| **POST Register (Role Restriction Violation)** | `POST` | `/api/v1/auth/register` | Status 400, `VALIDATION_ERROR` on role `officer` / `admin` |
| **POST Register (Short Password)** | `POST` | `/api/v1/auth/register` | Status 400, `VALIDATION_ERROR` on password < 8 characters |
| **POST Login (Success - Citizen)** | `POST` | `/api/v1/auth/login` | Status 200, returns `accessToken`, sets `{{accessToken}}` in environment, verifies HTTP-only refresh cookie |
| **POST Login (Invalid Password)** | `POST` | `/api/v1/auth/login` | Status 401, generic `INVALID_CREDENTIALS` error |
| **GET Current User (Authenticated)** | `GET` | `/api/v1/users/me` | Status 200, Bearer auth, returns user profile, no passwordHash |
| **GET Current User (Missing Token)** | `GET` | `/api/v1/users/me` | Status 401, unauthorized when Bearer token is omitted |
| **POST Refresh Token** | `POST` | `/api/v1/auth/refresh` | Status 200, uses HTTP-only cookie, returns new `accessToken`, updates environment |
| **POST Logout** | `POST` | `/api/v1/auth/logout` | Status 200, revokes session, clears refresh cookie |

---

### 3. Public Read APIs (`03. Public Read APIs`)
| Request | Method | Endpoint | Verifications |
| :--- | :---: | :--- | :--- |
| **GET Public Stats** | `GET` | `/api/v1/public/stats` | Status 200, counter fields (`publishedAlerts`, `blockedRoads`, `roadsUnderCaution`, `openRoads`, `totalMonitoredCorridors`) |
| **GET Public Risk Map (All)** | `GET` | `/api/v1/public/risk-map` | Status 200, corridor array with `name`, `code`, `state`, `status`, `riskLevel`; no internal fields |
| **GET Public Risk Map (State Filter)** | `GET` | `/api/v1/public/risk-map?state=Uttarakhand` | Status 200, every corridor matches state filter |
| **GET Public Alerts (Published)** | `GET` | `/api/v1/public/alerts` | Status 200, pagination metadata (`page`, `limit`, `total`, `totalPages`), only published alerts, no `createdBy` or `isDeleted` |
| **GET Public Alerts (Filtered & Paginated)** | `GET` | `/api/v1/public/alerts?severity=Critical&state=Uttarakhand&page=1&limit=5` | Status 200, pagination limits respected, filters applied |
| **GET Public Alerts (Invalid Severity)** | `GET` | `/api/v1/public/alerts?severity=ExtremeDanger` | Status 400, `VALIDATION_ERROR` on invalid enum |
| **GET Public Road Status (All)** | `GET` | `/api/v1/public/road-status` | Status 200, road array with `status`, `riskLevel`, `lastUpdated` |
| **GET Public Road Status (Filtered)** | `GET` | `/api/v1/public/road-status?status=blocked&state=Uttarakhand` | Status 200, all returned roads are blocked in Uttarakhand |
| **GET Public Road Status (Invalid Status)** | `GET` | `/api/v1/public/road-status?status=destroyed` | Status 400, `VALIDATION_ERROR` on invalid enum |

---

### 4. Public Write APIs (`04. Public Write APIs`)
| Request | Method | Endpoint | Verifications |
| :--- | :---: | :--- | :--- |
| **POST Hazard Report (Full Fields & Coordinates)** | `POST` | `/api/v1/reports/public` | Status 201, unique `reportId` (`TR-YYYY-XXXX`), `status: 'submitted'`, `source: 'public'`, coordinates parsed, valid Turnstile token, no `ipAddress` or `userAgent` exposed |
| **POST Hazard Report (Minimal Fields)** | `POST` | `/api/v1/reports/public` | Status 201, `severity` defaults to `'Warning'`, `status` defaults to `'submitted'` |
| **POST Hazard Report (Missing Location)** | `POST` | `/api/v1/reports/public` | Status 400, `VALIDATION_ERROR` on missing `location` |
| **POST Hazard Report (Coordinates Out of Bounds)** | `POST` | `/api/v1/reports/public` | Status 400, `VALIDATION_ERROR` when longitude > 180 |
| **POST Hazard Report (Missing CAPTCHA Token)** | `POST` | `/api/v1/reports/public` | Status 400, `VALIDATION_ERROR` when `captchaToken` is missing |
| **POST Hazard Report (Insecure Photo URL)** | `POST` | `/api/v1/reports/public` | Status 400, `VALIDATION_ERROR` when photo URL scheme is not HTTPS |
| **POST Hazard Report (Unapproved Storage Domain)** | `POST` | `/api/v1/reports/public` | Status 400, `VALIDATION_ERROR` when photo URL host is not in `ALLOWED_PHOTO_DOMAINS` |
| **POST Hazard Report (Mass Assignment)** | `POST` | `/api/v1/reports/public` | Status 201, forged `status: 'verified'` and `source: 'field_officer'` stripped and ignored |
| **POST Submit Contact (Full Fields)** | `POST` | `/api/v1/contact` | Status 201, `status: 'new'`, email normalized to lowercase, no internal `notes` or `ipAddress` leaked |
| **POST Submit Contact (Invalid Email)** | `POST` | `/api/v1/contact` | Status 400, `VALIDATION_ERROR` on malformed email |
| **POST Submit Contact (Message Too Short)** | `POST` | `/api/v1/contact` | Status 400, `VALIDATION_ERROR` on message < 5 characters |
| **POST Submit Contact (Mass Assignment)** | `POST` | `/api/v1/contact` | Status 201, forged `status: 'resolved'` stripped and forced to `'new'` |

---

### 5. Security & Rate Limiting (`05. Security & Rate Limiting`)
| Request | Method | Endpoint | Verifications |
| :--- | :---: | :--- | :--- |
| **GET Security & Rate Limit Headers** | `GET` | `/api/v1/public/stats` | Verifies presence of Helmet headers (`X-Content-Type-Options`, `X-Frame-Options`) and rate limit headers (`RateLimit-Limit`, `RateLimit-Remaining`) |
| **GET Non-Existent Endpoint (404)** | `GET` | `/api/v1/non-existent-endpoint` | Status 404, standard `{ success: false, error: { code: 'ROUTE_NOT_FOUND', message: '...' } }` structure |

---

## 🔒 Security Remediations Implemented (Phase 2.5)

### 1. Cloudflare Turnstile CAPTCHA (Remediated)
- **Implementation**:
  - `captchaToken` required in `createPublicReportSchema`.
  - Server-side verification via Cloudflare Turnstile's `siteverify` endpoint in `captchaService`.
  - `CLOUDFLARE_TURNSTILE_SECRET_KEY` stored exclusively in environment variables and never exposed to the client.
  - Fail closed in production with HTTP 503 if the verification service is unavailable or misconfigured.
  - Clearly isolated test verifier strictly locked to `NODE_ENV === 'test'`.
  - Rejects missing, empty, expired, or invalid CAPTCHA tokens with HTTP 400.

### 2. IP Address and Trusted Proxy Topology (Remediated)
- **Implementation**:
  - Replaced manual leftmost parsing of raw `X-Forwarded-For` with Express's validated `req.ip`.
  - Configurable `TRUST_PROXY` environment variable defaulting to `'loopback'` for safe development.
  - Express and `express-rate-limit` use the exact same validated client IP, preventing rate limit bypass via spoofed client headers.

### 3. Report Photo URL Validation & Storage Allowlist (Remediated)
- **Implementation**:
  - Strict HTTPS validation requiring valid, well-formed URLs.
  - Unsafe schemes (`javascript:`, `data:`, `file:`, `http:`) are rejected immediately.
  - Hostnames are checked against `ALLOWED_PHOTO_DOMAINS` (e.g. `res.cloudinary.com,s3.amazonaws.com,storage.googleapis.com`).
  - If no storage provider is configured in environment, image URL submission is safely rejected rather than pretending uploads are supported.
  - The photo attachment field remains strictly optional.

