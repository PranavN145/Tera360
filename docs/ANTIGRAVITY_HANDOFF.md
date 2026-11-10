# Terra360 — Complete Antigravity Project Handoff Document

> **Document Purpose:** Self-contained engineering, product, architecture, audit, and Git handoff reference for Terra360 so a new Antigravity account or AI coding agent can continue development immediately without relying on prior chat history.  
> **Generated:** 2026-11-10 (Asia/Calcutta)  
> **Repository Baseline Commit:** `76cffbc` on branch `main` (`origin/main` at `https://github.com/PranavN145/Tera360.git`)  
> **Audit Baseline Commit:** `e778205` (with subsequent `c79e10b` and `76cffbc` re-verified against live workspace files and tools)  
> **Git Exclusion Rule:** **DO NOT commit `docs/` or `docs/ANTIGRAVITY_HANDOFF.md` to GitHub.** `.gitignore` does not ignore `docs/`; leave this file untracked locally unless explicitly instructed otherwise.  
> **Security Rule:** Zero secrets, passwords, API tokens, or `.env` values are included in this document.

### Verification & Confidence Legend
Throughout this document, status claims distinguish:
- **Verified (Code / Tool / Live Probe):** Directly confirmed by reading current repository files, running TypeScript/ESLint/build/test commands, inspecting `git` metadata, or querying read-only `GET` endpoints.
- **Inferred:** Logically deduced from code patterns or historical session transcripts where direct runtime execution was not possible.
- **Not Verified:** Cannot be confirmed from local repo/read-only checks (e.g., Vercel dashboard env settings, Atlas cluster IAM/backups, interactive authenticated production writes).

---

## 1. Project Overview

### 1.1 Purpose, Objectives & Problem Statement
**Terra360** is a landslide early-warning, monitoring, and community disaster-resilience web platform designed for the landslide-prone mountainous terrain of **Northeast India** (Assam, Meghalaya, Arunachal Pradesh, Sikkim, Nagaland, Manipur, Mizoram, and Tripura).

**Core Problem (from `PRD.md` §1.2):**
- Monsoon landslides frequently block arterial National Highways (e.g., NH-29, NH-10, NH-27, NH-6, NH-415) and isolate hill villages with minimal advance notice.
- Villagers, commuters/drivers, and rescue units lack **location-specific, actionable, local-language** warnings in time.
- Mobile internet and cellular data often drop during severe storms, making internet-only notifications insufficient; multi-channel **SMS, IVRS voice calls, and offline PWA caching** are required.
- Residents and ground inspectors observe early physical signs (slope cracks, tilting trees, muddy water, rockfalls) before catastrophe, requiring a structured reporting and triage pipeline.

**Core Objectives (from `PRD.md` §1.3 & §3):**
1. Convert satellite radar (SAR), rainfall, and slope/DEM model outputs into color-coded risk zones (`Low`, `Medium`/`Moderate`, `High`, `Critical`) overlaid on highways and villages.
2. Maintain **human-in-the-loop alerting**: AI/sensors propose risk updates, and Disaster Management Officers review and approve alerts (`Watch`, `Warning`, `Critical`).
3. Support multi-channel alert delivery (in-app, SMS, IVRS voice) and offline village/safe-shelter access.
4. Close the ground-truth loop via citizen and field-officer hazard reports with priority triage and road-clearance tracking.

### 1.2 Target Users & Current Scope Decision
The `PRD.md` defines five authenticated roles plus public visitors. **Current release scope explicitly focuses on the core emergency-warning loop while postponing Admin and Driver portals to a future phase:**

| Role (DB Enum) | Target User | Current Release Scope |
|---|---|---|
| *(unauthenticated)* | **Public Visitor** | **IN SCOPE** — Home, Public Risk Map Preview (Major NH), Published Alerts, Public Danger Report, About, Contact, Privacy, Terms, Auth pages |
| `officer` | **Disaster Management Officer** | **IN SCOPE** — Command Dashboard, Live Risk Map, Road Impact, Alert Center, Safe Routes, Villages/Population, Field Reports |
| `field_officer` | **Field Officer / Inspector** | **IN SCOPE** — My Tasks, Assigned Area Map, Reports Verification/Escalation, Road Status Updates, Sector Alerts, Profile |
| `citizen` | **Citizen / Villager** | **IN SCOPE** — Home Risk Status, My Area Risk, Safe Place (offline-cached shelters/routes), Report Hazard, Profile & Family Contacts |
| `driver` | **Driver / Commuter** | **POSTPONED — FUTURE PHASE** (PRD P2 optional; existing `/driver/route-check` UI stub & DB role enum exist) |
| `admin` | **Platform Administrator** | **POSTPONED — FUTURE PHASE** (PRD P2 optional; existing `/admin/users` UI stub & DB role enum exist) |

### 1.3 Technology Stack & Overall Architecture
| Layer | Stack Observed in Code (`package.json` / source) | Deployment Target |
|---|---|---|
| **Frontend** | Next.js `16.4.5` (App Router, Turbopack, `cacheComponents: true`, `partialPrefetching: true`), React `19.3.0`, TypeScript `^5`, Tailwind CSS `^4` (`@tailwindcss/turbopack`), `lucide-react` `^1.71.0`, `mapbox-gl` `^3.34.2` | **Vercel** (Target; dashboard config Not Verified) |
| **Backend API** | Node.js (TSX/TypeScript `^5.7.3`), Express `^4.21.2`, Mongoose `^8.13.0`, Zod `^4.6.7`, `jsonwebtoken` `^9.0.2`, `bcryptjs` `^3.0.3`, `helmet` `^8.0.0`, `cors` `^2.8.5`, `cookie-parser` `^1.4.7`, `express-rate-limit` `^7.5.0`, `nodemailer` `^10.3.1`, `dotenv` `^16.4.7` | **Render** (`https://tera360.onrender.com`, Verified live via `/health` & `/ready`) |
| **Database** | MongoDB Atlas (database name hardcoded as `Terra360` in `backend/src/config/db.ts`) | **MongoDB Atlas** (Verified connected via `/ready`) |
| **Bot Mitigation** | Cloudflare Turnstile server verifier (`backend/src/services/captcha.service.ts`) | Cloudflare (frontend widget **missing** on UI) |
| **GIS / Maps** | Mapbox GL JS `v3.34.2` (`outdoors-v12`, `satellite-streets-v12`, `light-v11` with 3D DEM terrain) | Mapbox (requires `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`) |

> **PRD Stack Deviations (Verified):** The PRD proposes TanStack Query, Axios, React Hook Form, DOMPurify, MapLibre GL JS / Leaflet, Recharts, Winston, `@sentry/node` / `@sentry/nextjs`, `node-cron`, and `next-intl`. **None of those packages are installed.** Instead, the frontend uses native `fetch` in `frontend/src/lib/api.ts`, React `useState`/`useEffect`/`useContext` (`AppContext`), and `mapbox-gl` `^3.34.2`.

### 1.4 Repository Structure & Important Directories
Note the workspace spelling: the repository folder is `Tera360/` (single `r`), while product branding and documentation use **Terra360** (double `r`).

```text
Indradhanu/                              # Parent design & dataset directory (outside Git repo)
├── design.md                            # Brand & UI design specification (v0.1 Draft)
├── plan.excalidraw                      # Original whiteboard architecture & wireframes
├── PRD.md / *.pdf                       # Copies of PRD & project plan
├── master_dataset.csv / raw_dataset.csv # ML geological training datasets (outside repo)
├── *.png                                # Original brand/logo/artwork source assets
└── Tera360/                             # Git repository root (PranavN145/Tera360)
    ├── .gitignore                       # Blocks node_modules, .next, dist, .env, *.env, keys
    ├── PRD.md                           # Authoritative 1,735-line Product Requirements Document
    ├── Readme.md                        # Repo onboarding & deployment guide
    ├── data/
    │   └── master_dataset.csv           # 10,800-row (10,801 lines) geological landslide dataset
    ├── docs/
    │   └── ANTIGRAVITY_HANDOFF.md       # THIS HANDOFF FILE (UNTRACKED — DO NOT COMMIT)
    ├── backend/
    │   ├── .env.example                 # Safe backend env template
    │   ├── .env                         # Local secrets (gitignored — NEVER commit/read values)
    │   ├── package.json                 # Scripts & dependencies
    │   ├── tsconfig.json / tsconfig.test.json
    │   ├── postman/                     # Postman collection.json, environment.json, field_officer_collection.json
    │   ├── server.js / field_officer.js / controllers/ / routes/  # LEGACY JS prototypes (unused by TS build)
    │   ├── tests/                       # Legacy JS verification scripts (fieldOfficer.test.js, verify_*.js)
    │   └── src/
    │       ├── server.ts                # Entry point: connectDB() -> app.listen(PORT, '0.0.0.0')
    │       ├── app.ts                   # Express middleware stack & mounted routes
    │       ├── config/                  # env.ts (Zod), db.ts, initCollections.ts
    │       ├── middleware/              # requireAuth, roleGuard, validate, mongoSanitize, uploadGuard, errorHandler
    │       ├── modules/
    │       │   ├── auth/                # routes, controller, service, schema
    │       │   ├── users/               # routes, controller, service, schema, user.model
    │       │   ├── public/              # routes, controller, service, schema
    │       │   ├── reports/             # routes, controller, service, schema, report.model
    │       │   ├── contact/             # routes, controller, service, schema, contact.model
    │       │   ├── alerts/              # alert.model.ts ONLY (no controller/routes/service)
    │       │   ├── roads/               # road.model.ts ONLY (no controller/routes/service)
    │       │   └── fieldOfficer/        # routes, controller, service (RAM arrays), mockData, schema, model (UNUSED)
    │       ├── scripts/                 # seed.ts, init-collections.ts, generate-postman.ts, test-integration.ts
    │       ├── services/                # captcha.service.ts, email.service.ts
    │       ├── types/express.d.ts       # Express Request.user augmentation
    │       ├── utils/                   # cookie.ts, crypto.ts, jwt.ts, ownershipCheck.ts, tokenCompare.ts
    │       └── tests/                   # 14 TS test suites
    └── frontend/
        ├── .env.example                 # Safe frontend env template
        ├── .env.local                   # Local frontend env (gitignored — has NEXT_PUBLIC_DEMO_MODE=true)
        ├── AGENTS.md                    # Next.js 16.4.5 generated notice (do not manually edit)
        ├── next.config.ts               # cacheComponents: true, partialPrefetching: true, Turbopack CSS
        ├── eslint.config.mjs            # ESLint 9 + eslint-config-next 16.4.5
        ├── package.json / tsconfig.json
        ├── public/images/               # Brand logos, mountain headers/footers, section bgs, map.png, reference img
        └── src/
            ├── App.jsx                  # LEGACY Vite/CRA prototype file (unused by Next.js App Router)
            ├── __tests__/               # frontend-demo-mode.test.ts (7 tests)
            ├── app/                     # Next.js App Router (40 page.tsx + 6 layout.tsx routes)
            ├── components/              # UI, layout, portal, home, officer, auth, modals, RiskMap.tsx (+ legacy RiskMap.jsx)
            ├── context/AppContext.tsx   # Global auth state, session restore, modals, toasts
            ├── data/                    # demoDataManager.ts, mockLandslideData.js, villages.ts, villagesData.ts
            ├── lib/                     # api.ts, fallbackData.ts
            └── types/                   # auth.ts, public.ts, fieldOfficer.ts, village.ts
```

---

## 2. Current Project Status

| Area | Status | Verified Details & Gaps |
|---|---|---|
| **Public Website** (`/`, `/risk-map`, `/alerts`, `/report`, `/about`, `/contact`, `/privacy`, `/terms`) | **Partially Implemented** | All 8 routes + `/account` compile and render responsively with zero horizontal overflow (`375px`–`1920px`). **Gaps:** `/report` lacks a Turnstile CAPTCHA widget, photo upload is disabled (`Cloud Storage Pending`), `/alerts` & `RiskMapSection` silently mask API/CORS failures with static `FALLBACK_*` data, `/contact` saves to DB without sending email, `GET /api/v1/public/risk-map` does not filter `isMajorNH: true` or return GeoJSON `FeatureCollection`, and Header nav links on subpages use `/#...` anchors. |
| **Officer Portal** (`/officer`, `/officer/dashboard`, `/officer/map`, `/officer/roads`, `/officer/alerts`, `/officer/routes`, `/officer/villages`, `/officer/reports`) | **Partially Implemented** | `/officer` redirects to `/officer/dashboard`. All 7 sub-pages have cohesive, redesigned UI and read live `publicApi` / `reportsApi` data where available. **Gaps:** All operational write workflows are missing or blocked—`AlertReviewModal` explicitly blocks broadcast (`POST /api/v1/alerts` unimplemented), `OfficerPriorityActions`, `OfficerDataStatus`, `/officer/routes`, and `/officer/villages` (`MONITORED_VILLAGES`) rely on static/in-memory data; `/officer/roads` and `/officer/reports` lack status-mutation endpoints; `officer/dashboard` hardcodes `villagesAtRiskCount = 2`. |
| **Field Officer Portal** (`/field`, `/field/tasks`, `/field/map`, `/field/reports`, `/field/roads`, `/field/alerts`, `/field/profile`) | **Partially Implemented** *(Split & Insecure)* | **Architectural split:** Sidebar (`portalNavConfig.ts`) routes to `/field/{tasks,map,reports,roads,alerts,profile}`, which query `publicApi`/`reportsApi` read-only and cannot mutate tasks/reports/roads/alerts. Meanwhile, the unlinked monolith `/field` (`field/page.tsx`) calls `fieldOfficerApi` (`/api/field-officer/*`), which runs **unauthenticated** (`optionalAuth`), trusts spoofable `x-officer-id`/`x-officer-sector` headers, mutates **volatile RAM arrays** (losing all data on restart), and includes hardcoded Uttarakhand coordinates (`Rampur Upper` `[30.1482, 78.3241]`) in `field/page.tsx`. |
| **Citizen Portal** (`/citizen`, `/citizen/home`, `/citizen/my-area`, `/citizen/safe-place`, `/citizen/report`, `/citizen/profile`) | **Partially Implemented** | `/citizen` redirects to `/citizen/home`. UI flows exist for all 5 pages; `citizen/profile` persists profile, village, family contacts, and alert preferences to `PATCH /api/v1/users/me` when authenticated. **Gaps:** `citizen/home` and `citizen/my-area` combine public state alerts/roads with static `villages.ts`; `citizen/safe-place` caches static `villages.ts` data in `localStorage` rather than a real `/me/offline-bundle` + IndexedDB PWA; `citizen/report` submits to `/api/v1/reports/public` with a hardcoded dummy Turnstile key; family check-in (`POST /me/checkin`), `/me/area`, `/me/safe-place`, and notifications APIs are **Missing**. |
| **Authentication & Authorization** | **Partially Implemented** *(Security Gaps)* | Register (`citizen`/`driver` only), login with 5-attempt/15-min lockout, JWT access (15m) + refresh (7d) with atomic `active`→`rotated`→`revoked` tombstone reuse detection, email verification, password reset, session list/revoke, GDPR export, and soft account deletion are implemented. **Critical Gaps:** Refresh token is exposed in JSON responses & stored in `localStorage`; `api.ts` performs passwordless demo fallback on `NETWORK_ERROR`/non-200; `COOKIE_SAMESITE` defaults to `'none'`; `NEXT_PUBLIC_DEMO_MODE=true` in local env & `AuthModal.tsx` always displays 1-click demo logins; `POST /auth/accept-invite` and 12-char staff passwords are missing; frontend route layouts are over-permissive (`citizen` allows `driver`/`admin`, `officer` & `field` allow `admin`, nested `PortalLayout` skips page-level `allowedRoles`). |
| **Backend & APIs** | **Partially Implemented** | Express server, Helmet, rate limiting, Zod body checks on mounted auth/public/contact/public-report routes, and 5 mounted route groups (`/auth`, `/users`, `/public`, `/reports`, `/contact` + insecure `/field-officer`) are running. **Gaps:** ~75% of PRD §14.4 endpoints (Officer CRUD, Alert lifecycle/dispatch, Report triage, Village/Shelter/Zone/Route APIs, Citizen `/me/*`, Internal `/internal/model-runs`, `/webhooks/sms`, `/webhooks/ivrs`, `cron.service.ts`) are **Missing**; `uploadGuard.ts` is unmounted; `mongoSanitize` skips `req.query`; regex queries are unescaped; Winston/Sentry absent. |
| **MongoDB Database** | **Partially Implemented** | Live MongoDB Atlas (`Terra360`) connected and verified via Render `/ready`. `initCollections.ts` creates/indexes 5 collections: `users`, `alerts`, `roads`, `reports`, `contacts`. **Gaps:** `fieldOfficer.model.ts` (`FieldOfficerTask`, `RoadStatusUpdate`, `AlertAcknowledgment`) is unused dead code; 15+ PRD §12 collections (`Invite`, `LoginAttempt`, `District`, `Area`, `Village`, `RiskZone`, `RiskHistory`, `AlertDelivery`, `AlertTemplate`, `Shelter`, `Notification`, `DataSource`, `ModelRun`, `RainfallObservation`, `AuditLog`) do **not** exist; sensitive `phone` & `familyContacts[].phone` are stored unencrypted. |
| **Mapbox & External Integrations** | **Partially Implemented** | `RiskMap.tsx` implements full 3D Mapbox GL JS terrain, layers, corridor arcs, sensor nodes, and rescue routes. **Gaps:** `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is missing in `frontend/.env.local` (causing `"Mapbox Access Token Required"` fallback locally and in `localhost_3000_officer_map.png`); `RiskMap.tsx` popups have raw HTML XSS sinks (`AUD-04`); SMS/IVRS providers, cloud photo storage, Sentry, and live SAR/rainfall ingest pipelines are **Missing**. |
| **Deployment (Vercel & Render)** | **Partially Implemented** *(Live Probes Pass, Production Not Ready)* | Render backend (`https://tera360.onrender.com`) is live (`/health` `200`, `/ready` `200`, `/public/*` `200`), **but** unauthenticated `/api/v1/field-officer/profile` returns `200` (`AUD-01`) and wildcard `*.vercel.app` CORS is open with `credentials: true` (`AUD-03`). Vercel frontend build (`next build`) passes (`41/41` routes), but `npm run lint` fails (`32 errors, 4 warnings`), CI workflows/IaC (`render.yaml`, `vercel.json`) are missing, and live Vercel deployment URL/env state is **Not Verified**. |
| **Admin & Driver Portals** | **Postponed — Future Phase** | Stubs only: `/driver/route-check` (static `ROUTE_PRESETS` UI) and `/admin/users` (static directory cards). Backend `/driver/*` and `/admin/*` endpoints do not exist. Excluded from current release scope by project decision. |

---

## 3. PRD and Feature Scope

### 3.1 Authoritative PRD Summary (`PRD.md`, v1.0, 1,735 lines)
- **§1–§3 Product & Goals:** SAR + rainfall + AI landslide prediction for Northeast India; multi-channel alert delivery (App push, SMS, IVRS voice, offline PWA); human-in-the-loop officer approval; ground-truth feedback loop; target metrics (approval→delivery ≤ 2 min, ≥ 90% delivery, high-priority triage ≤ 5 min, LCP ≤ 2.5s, 100% offline cached citizen villages, 0 high/critical `npm audit`).
- **§4 Scope Phases:** P0 (Foundation: repo, CI, env validation, email auth, roles, design system, health), P1 (MVP: Public website + Officer + Citizen + Field Officer portals), P2 (Optional: Driver + Admin portals), P3 (Excess: citizen volunteer verification network, AI triage model, shelter & evacuation intelligence).
- **§7 Cross-Cutting Features:** Email+password auth (no OAuth), invite-only staff accounts (`crypto.randomBytes(32)`), 15m JWT in memory + 7d `HttpOnly; Secure; SameSite=Strict` rotated refresh cookie, 5-fail/15m lockout, alert lifecycle (`draft`→`approved`→fan-out→`AlertDelivery` tracking & retries), rule-based report triage (`High`/`Medium`/`Low/Unverified`), PWA offline + IndexedDB report queue (no tokens), i18n (English + Assamese, Bengali, Hindi, etc.), notification bell, shelter safety checks.
- **§11–§20 Technical Standards:** Zod env validation crashing on bad prod config, 20+ MongoDB collections with `2dsphere` geospatial indexes, middleware order (`app.ts`), `assertOwnership()`/`assertInScope()` returning `404` (never `403`), AES-256-GCM encryption for family contacts, internal `/internal/model-runs` machine token with `timingSafeEqual`, webhook signature verification, `node-cron` jobs, CI pipeline.

### 3.2 Explicit Current-Release Scope Decision

> **CRITICAL SCOPE RULE FOR ALL FUTURE WORK:**  
> - **IN SCOPE (Current Release):** Public Website, Officer Portal, Field Officer Portal, Citizen Portal, Authentication & Security Hardening.  
> - **POSTPONED (Future Phase):** Admin Portal (`/admin/*`) and Driver Portal (`/driver/*`). Do **not** build out Admin or Driver backend/frontend features unless explicitly instructed by the user.

#### Current-Release Requirements (In Scope — P0 / P1)
1. **Public Website (`/`, `/risk-map`, `/alerts`, `/report`, `/about`, `/contact`, `/privacy`, `/terms`, `/account`, Auth routes):**
   - Live Major-NH risk map preview (GeoJSON/corridors without personal data), filtered approved alerts, interactive public hazard reporting with real Turnstile CAPTCHA + cloud photo upload + GPS, contact form backed by DB + email notification, email/password auth + account/session management.
2. **Officer Portal (`/officer/dashboard`, `/officer/map`, `/officer/roads`, `/officer/alerts`, `/officer/routes`, `/officer/villages`, `/officer/reports`):**
   - Live summary KPIs (`GET /officer/dashboard`), interactive risk-zone & sensor layers, zone click dossier, road status management (`PATCH /roads/:id/status`), draft/preview/approve/cancel/retry alerts (`POST /alerts`, `POST /alerts/:id/approve`, `AlertDelivery`, `AuditLog`), safe response routes (`POST /routes/safe`), monitored villages & shelters (`GET /villages/:id`), and report triage + task assignment (`PATCH /reports/:id/status`, `POST /tasks`).
3. **Field Officer Portal (`/field/*`):**
   - Unified MongoDB-backed sector operations behind `requireAuth` + `roleGuard('field_officer', 'officer', 'admin')` + sector scope (`404` on out-of-scope): inspect assigned tasks (`Assigned`→`In_Progress`→`Completed`/`Escalated`), verify/reject/escalate citizen reports & log new field reports, update road passability (`Open`/`Caution`/`Partially Blocked`/`Blocked` synced to Officer dashboard), view assigned area map, acknowledge sector alerts, manage profile/language.
4. **Citizen Portal (`/citizen/*`):**
   - Large-target, plain-language UI: own-village risk status (`GET /me/area`), voice/SMS alert playback, 1-tap emergency call & family "I'm safe" check-in (`POST /me/checkin`), simplified area map (`GET /me/area/map`), nearest safe shelter & directions (`GET /me/safe-place`), offline PWA bundle (`GET /me/offline-bundle` + IndexedDB/SW cache with "last synced" indicator & offline report queue, zero tokens in IndexedDB), authenticated hazard reporting (`POST /reports`, `GET /reports/mine`), and profile/family contacts/alert prefs (AES-256-GCM encrypted phones, `emailVerified` gate).
5. **Core Backend Platform & Security:**
   - Auth hardening (same-origin `/api/*` cookie proxy, no JSON/localStorage refresh tokens, invite-only staff onboarding or locked staff seeding, strict CORS, XSS-safe Mapbox popups & emails, CSP, `req.query` sanitization, regex escaping, Winston redacting logs, Sentry, cron jobs, ingest/webhook endpoints).

#### Postponed Requirements (Future Phase — P2 / P3)
- **Driver / Commuter Portal (P2):** `/driver/route-check`, `/driver/alerts`, `/driver/map`, `/driver/report`, `/driver/profile` and backend `POST /driver/route-check`, `/driver/routes`, `/driver/alerts`.
- **Admin Portal (P2):** `/admin/users`, `/admin/roles`, `/admin/districts`, `/admin/areas`, `/admin/templates`, `/admin/data-sources`, `/admin/model-runs`, `/admin/logs` and backend `/admin/*` CRUD endpoints (though `Invite` token acceptance for staff onboarding may be needed earlier via seed/CLI or Officer/Admin script).
- **P3 Excess Features:** Citizen volunteer verification network, ML-based report triage (after rule-based triage), Web Push notifications, audio voice-note uploads (`audio/*`).

### 3.3 Unresolved PRD Open Questions (`PRD.md` §23)
The next developer/product owner still needs stakeholder confirmation on:
1. Single-officer vs two-person approval for `Critical` alerts (`POST /alerts/:id/approve`).
2. Citizen sign-up without email (assisted field registration vs SMS/IVRS-only enrolment vs future phone OTP).
3. Exact launch regional languages (currently UI lists `en`, `as`, `bn`, `hi`, `mni`, `lus` in `users.schema.ts` & `citizen/profile`).
4. Real SMS/IVRS telecom provider selection & Indian DLT template IDs.
5. External ML model service host & GeoJSON output contract for `POST /internal/model-runs`.
6. Cloud storage provider (Cloudinary / S3 / GCS) for signed hazard photo uploads.
7. India data-residency / government hosting constraints and exact list of "Major NH" corridors.

---

## 4. Architecture and Technical Details

### 4.1 Frontend Architecture, Routing & Shared Components

#### App Router Inventory (Verified: 40 `page.tsx`, 6 `layout.tsx`, 41 static routes in `next build`)
- **Public & Auth Pages:**
  - `/` (`frontend/src/app/page.tsx`) — Hero (`Hero.tsx`), `RiskMapSection.tsx`, `LatestAlerts.tsx`, `HowItWorks.tsx`, `ReportDanger.tsx`.
  - `/risk-map` (`risk-map/page.tsx`) — Interactive `RiskMap` + state tabs + road status board + fallback stats.
  - `/alerts` (`alerts/page.tsx`) — Severity filters, search, grid/compact toggle, `<RelativeTime />`, modal trigger.
  - `/report` (`report/page.tsx`) — Public hazard form (missing Turnstile widget, local-only photo preview).
  - `/about`, `/contact`, `/privacy`, `/terms` — Static info & `POST /api/v1/contact` form.
  - `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/logout`, `/account`.
- **Officer Portal (`/officer/layout.tsx` -> `allowedRoles={["officer", "admin"]}`):**
  - `/officer` (redirects to `/officer/dashboard`), `/officer/dashboard`, `/officer/map`, `/officer/roads`, `/officer/alerts`, `/officer/routes`, `/officer/villages`, `/officer/reports`.
- **Field Officer Portal (`/field/layout.tsx` -> `allowedRoles={["field_officer", "admin"]}`):**
  - `/field` (`field/page.tsx` — 2,209-line monolith calling `fieldOfficerApi`, unlinked in sidebar!), `/field/tasks`, `/field/map`, `/field/reports`, `/field/roads`, `/field/alerts`, `/field/profile` (note: `field/profile` tries to restrict `allowedRoles={["field_officer"]}` but is bypassed by parent `field/layout.tsx`).
- **Citizen Portal (`/citizen/layout.tsx` -> `allowedRoles={["citizen", "driver", "admin"]}`):**
  - `/citizen` (redirects to `/citizen/home`), `/citizen/home`, `/citizen/my-area`, `/citizen/safe-place`, `/citizen/report`, `/citizen/profile`.
- **Postponed Future-Phase Stubs:**
  - `/driver/route-check` (`/driver/layout.tsx` -> `allowedRoles={["driver", "admin"]}`).
  - `/admin/users` (`/admin/layout.tsx` -> `allowedRoles={["admin"]}`).
- **Missing Standard Next.js Error Routes:** No `frontend/src/app/not-found.tsx` or `frontend/src/app/error.tsx` exists.

#### Core Frontend Modules & Shared Components
- **`frontend/src/context/AppContext.tsx`:** Holds `user`, `isLoadingAuth`, auth modals, report modal, alert detail modal, toast queue. On mount, checks `localStorage.getItem("terra360_has_session")` or `terra360_active_demo_user` and runs `authApi.refresh()` + `authApi.getMe()`, falling back to `demoDataManager.getActiveDemoUser()` if offline.
- **`frontend/src/lib/api.ts`:** Exports `refreshAccessToken()`, `rawApiRequest()`, `apiClient()`, `authApi`, `usersApi`, `publicApi`, `reportsApi`, `fieldOfficerApi`, `getRolePortalPath()`.
  - Uses in-memory `inMemoryAccessToken`, single-flight `refreshPromise` + `navigator.locks.request('terra360_auth_refresh', ...)` Web Lock, and `authRestorationPromise` queue.
  - **Security issues (`AUD-02`):** Stores `terra360_refresh_token` in `localStorage`, sends it in `x-refresh-token` / body, falls back to `'demo-offline-token'` on non-200 HTTP responses when a demo user exists in storage, and falls back to `demoDataManager` on `NETWORK_ERROR` across `login`, `register`, `getMe`, `usersApi`, `publicApi`, `reportsApi`.
- **`frontend/src/components/auth/ProtectedRoute.tsx`:** Redirects unauthenticated users to `/login?redirect=<pathname>` and renders an Access Denied card when `!allowedRoles.includes(user.role)`.
- **`frontend/src/components/portal/`:** `PortalLayout.tsx`, `PortalShell.tsx`, `PortalHeader.tsx`, `PortalSidebar.tsx`, `PortalFooter.tsx`, `PortalLoadingShell.tsx`, `PortalMetricGrid.tsx`, `PortalMetricCard.tsx`, `PortalSectionCard.tsx`, `PortalSplitLayout.tsx`, `PortalFilterBar.tsx`, `portalNavConfig.ts`, `index.ts` (re-exports `OfficerKpiCard` as `PortalKpiCard`).
- **`frontend/src/components/RiskMap.tsx`:** 2,747-line Mapbox GL JS 3D GIS engine supporting terrain (`outdoors-v12`), satellite (`satellite-streets-v12`), light (`light-v11`), and 2D flat modes, `mapbox-dem` terrain exaggeration, sky atmosphere, regional corridor arcs, rescue detour routes, heatmap, hillshade, field sensor hover tooltips, and click popups. *(Note: legacy `frontend/src/components/RiskMap.jsx` and `frontend/src/App.jsx` also remain in repo.)*
- **`frontend/src/data/`:** `demoDataManager.ts` (862-line `localStorage` offline/demo store), `mockLandslideData.js` (1,069 lines of Northeast state camera presets, telemetry dictionaries, simulated routes & sensors), `villages.ts` (shared Citizen/Officer village & shelter fixtures), `villagesData.ts` (`MONITORED_VILLAGES` for `/officer/villages`).

### 4.2 Backend Architecture, Middleware & Services
- **Entry (`backend/src/server.ts`):** Calls `connectDB()`, binds `0.0.0.0:PORT` (default `5000`), handles `SIGTERM`/`SIGINT` graceful shutdown with 10s force exit.
- **App Stack (`backend/src/app.ts`):**
  1. `app.set('trust proxy', resolveTrustProxy(env.TRUST_PROXY))`
  2. Probes: `GET /health` (200 JSON) & `GET /ready` (200 if `mongoose.connection.readyState === 1`, else 503) — before rate limiters.
  3. `helmet({ contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false, crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } })`
  4. `cors(...)` allowing `CORS_ORIGINS`, `CLIENT_URL`, `*`, or `/^https:\/\/.*\.vercel\.app$/` with `credentials: true` and `allowedHeaders` including `x-refresh-token`, `x-officer-id`, `x-officer-sector`. Throws plain `Error` (HTTP `500`) on rejected origins (`AUD-03`).
  5. `cookieParser()`
  6. `express.json({ limit: '10kb' })` & `express.urlencoded({ extended: true, limit: '10kb' })`
  7. `mongoSanitize` (`backend/src/middleware/mongoSanitize.ts`) — strips `$` and `.` keys on `req.body` and `req.params` (**skips `req.query`** — `AUD-11`).
  8. `globalApiLimiter` on `/api`: `150 req / 1 min` (code `TOO_MANY_REQUESTS`; PRD specifies `100/min`).
  9. Routes: `/api/v1/auth`, `/api/v1/users`, `/api/v1/public`, `/api/v1/reports`, `/api/v1/contact`, `/api/field-officer`, `/api/v1/field-officer`.
  10. JSON 404 handler (`ROUTE_NOT_FOUND`) -> `errorHandler` (`backend/src/middleware/errorHandler.ts`, handles Mongo `11000` -> `409 CONFLICT`, masks 500 messages in production).
- **Other Middleware & Services:**
  - `requireAuth.ts`: Verifies Bearer access JWT, loads user (`isActive`, `!isDeleted`), populates `req.user` (`id`, `email`, `role`, `name`, `emailVerified`, `isActive`; omits `department`/`assignedArea`/`phone`/`language`). Also exports `optionalAuth`.
  - `roleGuard.ts`: Enforces `allowedRoles.includes(req.user.role)`, throws `403 FORBIDDEN`.
  - `validate.ts`: Zod schema validator (`body`, `query`, `params`), returns `400 VALIDATION_ERROR` with `fields`.
  - `uploadGuard.ts`: Header-only check (`5 MB`, `ALLOWED_MIME_TYPES`), throws `400 UPLOAD_ERROR` — **currently unmounted in all routes**.
  - `captcha.service.ts`: Calls `https://challenges.cloudflare.com/turnstile/v0/siteverify` (6s timeout, fails closed in production if `CLOUDFLARE_TURNSTILE_SECRET_KEY` missing; test mode mocks only when `NODE_ENV === 'test'`).
  - `email.service.ts`: Nodemailer SMTP wrapper with dev console/memory fallback (`getDevEmailLogs()`); skips in prod if SMTP unconfigured; interpolates `${name}` raw into HTML (`AUD-04`).

### 4.3 API Endpoint Catalog & Implementation Status
*(All API paths below are relative to backend origin; mounted routes are under `/api/v1` unless noted.)*

#### Auth & Account (`backend/src/modules/auth/`, `users/`)
| Method & Path | Status | Auth / Rate Limit | Notes vs PRD |
|---|---|---|---|
| `GET /health`, `GET /ready` | **Implemented** | Public, unthrottled | Verified live HTTP `200` on Render |
| `POST /api/v1/auth/register` | **Implemented** *(Gap)* | Public, `authLimiter` (15/min) | Restricts role to `citizen`/`driver`; throws `409` on duplicate email (enumeration risk, `AUD-12`) |
| `POST /api/v1/auth/login` | **Implemented** *(Gaps)* | Public, `authLimiter` | 5-fail/15m lock returns `401 ACCOUNT_LOCKED` (PRD says `403`); leaks `refreshToken` in JSON (`AUD-02`) |
| `POST /api/v1/auth/refresh` | **Implemented** *(Gaps)* | Cookie / body / header | Atomic tombstone rotation + reuse revocation works; accepts body/`x-refresh-token` & returns `refreshToken` in JSON (`AUD-02`); emits `INVALID_REFRESH_TOKEN` (`AUD-12`) |
| `POST /api/v1/auth/logout` | **Implemented** | Optional cookie/body/header | Revokes session (`reason: 'logout'`) & clears cookie |
| `POST /api/v1/auth/verify-email` | **Implemented** | Public, `authLimiter` | Single-use SHA-256 token, 24h TTL |
| `POST /api/v1/auth/forgot-password` | **Implemented** | Public, `authLimiter` | Generic message; 1h SHA-256 token |
| `POST /api/v1/auth/reset-password` | **Implemented** | Public, `authLimiter` | Resets password & revokes active sessions |
| `POST /api/v1/auth/accept-invite` | **Missing** | — | No `Invite` model or endpoint exists (`AUD-12`) |
| `GET /api/v1/users/me` | **Implemented** | `requireAuth` | Returns sanitized user profile |
| `PATCH /api/v1/users/me` | **Implemented** *(Gap)* | `requireAuth` | Updates name/phone/language/village/familyContacts/alertPrefs; lacks `emailVerified` check & phone encryption (`AUD-11`, `AUD-12`) |
| `PATCH /api/v1/users/me/password` | **Implemented** | `requireAuth` | Revokes other active sessions (`password_change`) |
| `GET /api/v1/users/me/sessions` | **Implemented** | `requireAuth` | Lists active unexpired sessions |
| `DELETE /api/v1/users/me/sessions/:id` | **Implemented** *(Gap)* | `requireAuth` | Revokes session as 404 on mismatch; `:id` lacks Zod ObjectId validation (`AUD-11`) |
| `GET /api/v1/users/me/export` | **Implemented** | `requireAuth` | Exports user account + own `Report` docs by `reporterId` |
| `DELETE /api/v1/users/me` | **Implemented** | `requireAuth` | Requires `"DELETE"`; soft-deletes & revokes sessions |

#### Public & Reporting (`public/`, `reports/`, `contact/`)
| Method & Path | Status | Notes vs PRD |
|---|---|---|
| `GET /api/v1/public/risk-map` | **Partially Implemented** | Validates `state` query; **missing** `isMajorNH: true` filter, GeoJSON `FeatureCollection`, bbox filter, and regex escaping (`AUD-11`, `AUD-14`) |
| `GET /api/v1/public/alerts` | **Implemented** *(Gap)* | Returns paginated `status: 'published'` alerts; unescaped `state` `RegExp` (`AUD-11`) |
| `GET /api/v1/public/road-status` | **Implemented** *(Gap)* | Filters by `state`/`status`; unescaped `state` `RegExp` (`AUD-11`) |
| `GET /api/v1/public/stats` | **Implemented** | Live DB counts (`publishedAlerts`, `criticalAlerts`, `blockedRoads`, `roadsUnderCaution`, `openRoads`, `totalMonitoredCorridors`, `communityReportsSubmitted`) |
| `POST /api/v1/reports/public` | **Implemented** *(Gaps)* | `publicReportLimiter` (10/15min), `optionalAuth`, server Turnstile check, HTTPS domain check on `photoUrl`; frontend lacks Turnstile widget & cloud upload (`AUD-06`) |
| `POST /api/v1/contact` | **Implemented** *(Gap)* | `contactLimiter` (10/15min); saves to `contacts` collection without sending email (`AUD-14`) |
| `GET /api/v1/reports/my` | **Implemented** | `requireAuth`; scopes strictly to `reporterId: user._id` |
| `GET /api/v1/reports` | **Implemented** *(Gaps)* | `requireAuth` + `roleGuard('officer', 'admin', 'field_officer')`; lacks Zod query schema, field-officer sector scoping, and unescaped `RegExp`; exposes `reporterPhone` (`AUD-11`) |

#### Field Officer (`fieldOfficer/`) — CRITICAL SECURITY & PERSISTENCE DEFECTS
Mounted at **both** `/api/field-officer/*` (unversioned, used by `frontend/src/lib/api.ts`) and `/api/v1/field-officer/*`:
- **Implemented Endpoints (In-Memory Mock Only):**
  - `GET /profile`, `PATCH /profile/language`
  - `GET /tasks`, `PATCH /tasks/:id/start`, `PATCH /tasks/:id/complete`, `POST /tasks/:id/escalate`
  - `GET /map/data`
  - `GET /reports`, `PATCH /reports/:id/verify`, `PATCH /reports/:id/reject`, `POST /reports/:id/escalate`
  - `GET /road-status/current`, `POST /road-status/update`
  - `GET /alerts`, `PATCH /alerts/:id/acknowledge`
- **Status Classification:** **Partially Implemented (Insecure / Non-Persistent)** — Uses `optionalAuth` (returns HTTP 200 anonymously), trusts `x-officer-id` & `x-officer-sector` headers, mutates RAM arrays instead of MongoDB, and returns `403 FORBIDDEN_SECTOR_ACCESS` instead of `404` (`AUD-01`).

#### Missing Current-Scope Endpoints (PRD §14.4)
- **Officer:** `GET /api/v1/officer/dashboard`, `GET /risk-zones`, `GET /risk-zones/:id`, `GET /layers/:name`, `GET /roads/impact`, `PATCH /roads/:id/status`, `GET/POST /alerts`, `POST /alerts/:id/preview`, `POST /alerts/:id/approve`, `POST /alerts/:id/cancel`, `GET /alerts/:id/deliveries`, `POST /alerts/:id/retry-failed`, `POST /routes/safe`, `GET /villages`, `GET /villages/:id`, `GET /reports/:id`, `PATCH /reports/:id/status`, `POST /tasks`.
- **Citizen:** `GET /api/v1/me/area`, `GET /api/v1/me/area/map`, `GET /api/v1/me/safe-place`, `GET /api/v1/me/offline-bundle`, `POST /api/v1/reports` (authenticated citizen report without public captcha dependency), `POST /api/v1/me/checkin`, `GET/PATCH /api/v1/notifications`.
- **Internal / System:** `POST /api/v1/internal/model-runs`, `POST /api/v1/webhooks/sms`, `POST /api/v1/webhooks/ivrs`.
- **Postponed Future-Phase Endpoints:** All `/api/v1/driver/*` and `/api/v1/admin/*` endpoints.

### 4.4 MongoDB Models, Collections & Relationships
`backend/src/config/initCollections.ts` creates and indexes **only 5 active collections** in database `Terra360`:

1. **`users`** (`backend/src/modules/users/user.model.ts`): `name`, `email` (unique, lowercase), `passwordHash` (`select: false`), `role` (`citizen|driver|field_officer|officer|admin`), `phone` (plaintext), `language`, `village { state, district, villageName }`, `familyContacts[] { name, phone, relationship }` (plaintext), `alertPreferences { ivrs, sms, app }`, email verification & password reset token hashes (`select: false`), `isActive`, `failedLogins`, `lockedUntil`, `refreshTokens[] { hash, status ('active'|'rotated'|'revoked'), createdAt, expiresAt, userAgent, ip, revokedAt, revocationReason, replacedByTokenHash }`, soft delete (`isDeleted`, `deletedAt`).
2. **`alerts`** (`backend/src/modules/alerts/alert.model.ts`): `title`, `severity` (`Critical|Warning|Watch`), `state`, `corridor`, `location`, `description`, `coordinates` (GeoJSON `Point`, `2dsphere` sparse), `coordinatesText`, `rainfall24h`, `saturation`, `trafficStatus`, `advisory`, `status` (`draft|published|cancelled` — diverges from PRD `draft|approved|sent|cancelled|expired`), `publishedAt`, `createdBy` (ref `User`), soft delete.
3. **`roads`** (`backend/src/modules/roads/road.model.ts`): `name`, `code`, `state`, `stretch`, `geometry` (`Point|LineString`, `2dsphere` sparse), `coordinatesText`, `mapCoordinates { x, y }`, `status` (`open|caution|partial|blocked`), `riskLevel` (`Low|Moderate|High|Critical` — diverges from PRD `Medium`), `statusReason`, `isMajorNH`, `lastUpdated`, soft delete.
4. **`reports`** (`backend/src/modules/reports/report.model.ts`): `reportId` (`TR-YYYY-XXXXXX`), `state`, `location`, `hazardType`, `severity` (`Critical|Warning|Watch`), `description`, `reporterName`, `reporterPhone`, `photoUrl`, `status` (`submitted|under_review|verified|rejected` — diverges from PRD `new|under_review|verified|false_alarm`), `source` (`public|citizen|field_officer`), `reporterId` (ref `User`), `coordinates` (GeoJSON `Point`, `2dsphere` sparse), `ipAddress`, `userAgent`, `verifiedBy` (ref `User`), `verifiedAt`, `verificationNotes`, soft delete.
5. **`contacts`** (`backend/src/modules/contact/contact.model.ts`): `name`, `email`, `state`, `message`, `phone`, `status` (`new|in_progress|resolved|archived`), `ipAddress`, `userAgent`, `notes`.

**Unused Schema File:** `backend/src/modules/fieldOfficer/fieldOfficer.model.ts` defines `FieldOfficerTaskModel`, `RoadStatusUpdateModel`, and `AlertAcknowledgmentModel` with `2dsphere` index, but is **never imported anywhere in backend runtime**.  
**Missing PRD §12 Collections:** `Invite`, `LoginAttempt`, `District`, `Area`, `Village`, `RiskZone`, `RiskHistory`, `AlertDelivery`, `AlertTemplate`, `Task`, `Shelter`, `Notification`, `DataSource`, `ModelRun`, `RainfallObservation`, `AuditLog`.

### 4.5 Authentication Flow, Tokens, Cookies & RBAC
- **Intended Design:** Access JWT (`15m`) kept strictly in memory (`inMemoryAccessToken` in `api.ts`), sent via `Authorization: Bearer`. Refresh JWT (`7d`) stored as SHA-256 hash in `User.refreshTokens[]` with atomic `findOneAndUpdate` rotation (`active` -> `rotated` + `replacedByTokenHash`) and replay detection (presenting an unexpired `rotated` token revokes all active sessions for that user with `TOKEN_REUSE_DETECTED`; presenting a `revoked` token returns `401 SESSION_REVOKED`). Frontend serializes refresh calls with `refreshPromise` + `navigator.locks.request`.
- **Actual Security Deviations (`AUD-02`, `AUD-08`, `AUD-09`):**
  1. `auth.controller.ts` returns `refreshToken` in JSON on `/login` and `/refresh` and accepts `req.body.refreshToken` / `x-refresh-token`.
  2. `frontend/src/lib/api.ts` persists `terra360_refresh_token` in `localStorage` and falls back to `'demo-offline-token'` / `demoDataManager` on `NETWORK_ERROR` or non-200 refresh responses when a cached demo user exists.
  3. `backend/src/config/env.ts` defaults `COOKIE_SAMESITE` to `'none'` (cookie helper `cookie.ts` sets `httpOnly: true`, `secure: sameSite === 'none' || NODE_ENV === 'production'`, `path: '/'`, omits `domain` on `.onrender.com`/`.vercel.app`).
  4. **RBAC Drift:** Backend `fieldOfficer.routes.ts` uses `optionalAuth` (no `roleGuard`). Frontend `citizen/layout.tsx` allows `["citizen", "driver", "admin"]`; `officer/layout.tsx` allows `["officer", "admin"]`; `field/layout.tsx` allows `["field_officer", "admin"]`; and `PortalLayout.tsx` short-circuits when `parentLayout.isInsidePortalLayout` is true, ignoring nested page `allowedRoles` (e.g., `field/profile/page.tsx` `["field_officer"]`).

### 4.6 Environment Variable Names (NO VALUES)

#### Backend (`backend/src/config/env.ts` & `backend/.env` & `backend/.env.example`)
*Currently present in local `backend/.env` (keys verified without reading values):*
- `NODE_ENV`, `PORT`, `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `CLIENT_URL`, `CORS_ORIGINS`, `COOKIE_DOMAIN`, `COOKIE_SAMESITE`, `ENCRYPTION_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `CLOUDFLARE_TURNSTILE_SECRET_KEY`, `TRUST_PROXY`, `ALLOWED_PHOTO_DOMAINS`.
*Note:* `ENCRYPTION_KEY` is validated (`min(32)`) in `env.ts` but **never used** anywhere in runtime code. `PRD.md` §11 also lists unimplemented variables: `SMS_PROVIDER`, `SMS_API_KEY`, `SMS_SENDER_ID`, `SMS_DLT_ENTITY_ID`, `IVRS_API_KEY`, `IVRS_CALLER_ID`, `RAINFALL_API_URL`, `RAINFALL_API_KEY`, `MODEL_INGEST_TOKEN`, `INGEST_CRON`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `MAX_UPLOAD_MB`, `CAPTCHA_SECRET` (superseded by `CLOUDFLARE_TURNSTILE_SECRET_KEY`), `SENTRY_DSN`. *(Note: `backend/src/scripts/generate-postman.ts` references `env.API_BASE_URL` for Postman script tooling.)*

#### Frontend (`frontend/.env.local` & `frontend/.env.example` & `frontend/src/`)
*Present in local `frontend/.env.local` (keys only):*
- `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DEMO_MODE` (**Warning:** currently set to `true` locally).
*Referenced in `frontend/.env.example` and/or frontend code:*
- `NEXT_PUBLIC_API_URL` (`frontend/src/lib/api.ts`)
- `NEXT_PUBLIC_DEV_CAPTCHA_TOKEN` (`report/page.tsx`, `ReportModal.tsx`, `citizen/report/page.tsx`)
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` (`RiskMap.tsx`, `RiskMap.jsx`; **missing in `.env.local`**)
- `VITE_MAPBOX_ACCESS_TOKEN` (legacy fallback check in `RiskMap.tsx` / `RiskMap.jsx`)
- `NEXT_PUBLIC_DEMO_MODE` (`login/page.tsx`; **missing from `.env.example`**)
*Missing vs PRD §11:* `frontend/src/lib/env.ts` (Zod validator), `NEXT_PUBLIC_CAPTCHA_SITE_KEY`, `NEXT_PUBLIC_DEFAULT_LANGUAGE`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_MAP_STYLE_URL`.

---

## 5. UI/UX and Design System

### 5.1 Approved Color Palette & Tokens (`frontend/src/app/globals.css` & `design.md`)
| Token | Name | Hex | Verified Usage |
|---|---|---|---|
| `--forest` / `forest` | Forest Canopy | `#173D32` | Primary headings, body foreground, primary buttons, active nav pills, dark cards |
| `--misty-hills` / `mist` | Misty Hills | `#DCE8D4` | Secondary surfaces, active sidebar pill, icon badges, selection highlight |
| `--ochre` / `ochre` | Earth & Ochre | `#D6A65D` | Accent CTAs ("Broadcast Alert"), brush-stroke underlines, "360" highlight, wave accents |
| `--cloud-white` / `cloud` | Cloud White | `#F6F4EC` | Page background, text on dark forest surfaces |
| *(Surface/Footer)* | Warm Cream / Deep Valley | `#FAF8F2` / `#0A4030` | Card containers (`#FAF8F2`), footer valley background (`#0A4030`) |
| *(Neutrals)* | Muted / Border | `#64756C` / `#DCE3D8` | Secondary text (`#173D32/70–85`), subtle card borders (`#173D32/12–15`) |

**Semantic Status & Risk Colors (Implemented in `StatusBadge.tsx`, `OfficerKpiCard.tsx`, `RiskMap.tsx`):**
- Critical / Blocked: `#DC2626` / `#C52936` on `#FDE8E8` / `#FDECEC`
- Warning / Caution / High: `#D97706` / `#B45E09` / `#F59E0B` on `#FEEFD6` / `#FEF1DC`
- Watch / Moderate / Info: `#D6A65D` / `#2563EB` / `#17688A` on `#FEFCE8` / `#E1ECFF` / `#E2F1F8`
- Safe / Open / Low / Nominal: `#16A34A` / `#1E7A45` on `#DCFCE7` / `#E2F4E8`
- **Accessibility Rule (`PRD.md` §8.2 & `design.md` §1):** Never convey risk by color alone; pair color with a Lucide icon and clear text label.

### 5.2 Typography & Sizing
- Currently `frontend/src/app/layout.tsx` loads `Geist` (`--font-geist-sans`) and `Geist_Mono` (`--font-geist-mono`) via `next/font/google`, mapped in `globals.css`. *(PRD §8.4 / `design.md` §4 suggest humanist sans like Poppins/Inter + Noto Sans for regional Indic scripts — treat as a planned enhancement for localization, not an urgent redesign).*
- Citizen UI favors large tap targets (`min-h-[44px]`/`48px`), plain language, and >= 16px readable text.
- `@media (prefers-reduced-motion: reduce)` is present in `globals.css` for `.animate-radar-sweep`, `.animate-radar-pulse`, and `.animate-float`.

### 5.3 Header, Sidebar, Footer & Shared Portal Shell
- **Public Header (`frontend/src/components/layout/Header.tsx`):** Floating centered capsule (`#F6F4EC/95`, `rounded-[36px]`, `max-w-[820px]` or `max-w-[940px]` when signed in) with `header_logo.png`, scroll-spy links (`Home`, `Risk Map`, `Alerts`, `About`, `Report`), Login/Register or Account/Portal/Logout capsule buttons, and mobile drawer (`max-h-[calc(100dvh-5.75rem)]`).
- **Shared Portal Chrome (`frontend/src/components/portal/`):**
  - `PortalLayout.tsx`: Wraps `ProtectedRoute`, maintains `PortalLayoutContext` to avoid remounting header/sidebar/footer across sibling portal tabs, renders Back button + breadcrumb + page title + `headerActions`.
  - `PortalHeader.tsx`: Uses `/images/header.png` misty mountain artwork, `header_logo.png`, portal role badge, `Dev Mode` pill (`lg+`), notification bell (`DropdownPortal`, currently hardcoded `unreadCount = 0`), and avatar menu (`My Profile`, `Account Settings`, `Public Website`, `Logout`).
  - `PortalSidebar.tsx`: Collapsible desktop sidebar (`w-64` / `w-20`) + mobile drawer, `/images/side navbar.png` masked landscape art at bottom, active pill in `#DCE8D4`, `Ops Center Live` status card linking to `/risk-map`.
  - `PortalFooter.tsx` & `Footer.tsx`: Split mountain horizon + `#0A4030` valley + tribal border (`footer_bg.png`, `footer_logo.png`), tagline `MONITOR · ANALYZE · PROTECT`, links (`About | Privacy Policy | Terms of Use | Contact`), social buttons, `© 2026 Terra360. All rights reserved.`. `PublicFooter.tsx` suppresses the public footer on `/officer`, `/admin`, `/citizen`, `/field`, `/driver`.

### 5.4 Approved Dashboard & Portal Page Designs (DO NOT Redesign Unnecessarily)
The following layouts were explicitly iterated and approved on 2026-11-10 using Lucide icons (zero emojis) and shared portal primitives:
1. **Officer Dashboard (`/officer/dashboard` — full-width single-column vertical flow):**
   - 5 wave-bottom KPI cards (`OfficerSummaryCards` using reusable `OfficerKpiCard` in 5-col `xl` responsive grid).
   - `OfficerMiniRiskMap`: Full-width Mapbox 3D hotspot/corridor section with left floating **Map Layers** + **Risk Level** legend, **Terrain** selector (`Terrain`, `Satellite`, `Light 3D`, `2D Flat`), zoom/geolocate controls, `All`/`Critical Only`/`Expand Map` header controls, and bottom **Active Hotspots** strip.
   - `OfficerAiRiskUpdates`: Left dark-green **Risk Overview (Last 24h)** card + right 3 latest rows + **View All Updates ->** toggle to a full vertical timeline view.
   - `OfficerPriorityActions`: `All`/`Pending`/`Done` tabs, `Select All` (indeterminate support), `Mark as Done`, `Bulk Action` dropdown (`DropdownPortal`), structured table (`Priority`, `Action`, `Location`, `Updated`, `Status`) + 3-dot row menu.
   - `OfficerDataStatus`: 3 evenly sized wave-bottom cards (`Sentinel-1 SAR Radar`, `Precipitation Telemetry`, `Slope Geotechnical Mesh`) with badges (`OK · Nominal`, `OK · Active`, `12 / 12 Online`) and bottom ingest/telemetry metrics.
2. **Officer Live Risk Map (`/officer/map`):** Top 9-state horizontal filter pills (`All States` + 8 NE states) + right filter dropdown, 4 wave-bottom KPI cards, `PortalSplitLayout` with 3D `RiskMap` + floating `OfficerLiveCorridorHud` on left and `OfficerCorridorDossier` + `OfficerCorridorAlertModal` on right.
3. **Officer Road Impact (`/officer/roads`):** 4 summary KPI cards + unified filter bar + compact divider-separated horizontal rows with colored left status bars and `Locate on Map ->` links.
4. **Officer Alert Center (`/officer/alerts`):** 4 summary KPI cards + `AlertSectionBanner` (hillside SVG artwork) + 2-column `AlertComposer` & `AlertHistoryFeed` + `AlertReviewModal`.
5. **Officer Villages (`/officer/villages`):** 4 overview KPI cards + horizontal `VillageRiskHistoryBar` + table/card toggle (with `md:hidden` stacked accessible rows showing all 6 columns) + right 4-tab `VillageDetailPanel`.

### 5.5 Mapbox Implementation & Visual Reference
- **Implementation:** `frontend/src/components/RiskMap.tsx` handles Mapbox GL JS 3D terrain (`mapbox-dem`), `sky` layer, regional corridor curves (`NH-29`, `NH-10`, `NH-27`, `NH-6`, etc.), simulated landslide hazard heatmaps, dashed alternate rescue bypass lines (`Peducha – Tsiesema`), field sensor nodes, and pulsing collapse markers.
- **Approved Visual Reference Notes:**
  - `frontend/public/images/localhost_3000_officer_map.png` captures the `/officer/map` layout structure (note: token was missing when that snapshot was captured).
  - Session `4803ad36` (`media_1794308014366_9e4885da.jpg`), `f210dc51` (`media_1794304643990_91ebd0ba.jpg`), and `1298c7bc` (`media_1794243061206_a602a0c7.jpg`) document the target Mapbox 3D visual style: dark forest/satellite terrain relief, crisp left floating `LIVE CORRIDOR HUD` with 3 color-coded cards (Alert, Rainfall, Alternate Route) and toggle switches, top-right map controls, bottom-left scale bar.
  - **Explicitly Approved Removal (`d6451c4`):** The bottom `Monsoon Simulation Playback` overlay card was intentionally removed; do **not** re-add it unless asked.

### 5.6 Responsive Design Status
- Commit `76cffbc` (2026-11-10) optimized responsiveness across public pages, auth, Officer, Field Officer, Citizen, Driver, and Admin views, verified via headless Chrome DevTools across `375x812`, `430x932`, `768x1024`, `1024x768`, `1366x768`, and `1920x1080` with zero horizontal page overflow.
- **Responsive Caveat:** Because `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` was missing locally, Mapbox WebGL marker click popups inside `RiskMap.tsx` were only checked in code (`min(…, 72vw)`/`84vw`), not clicked visually on live WebGL tiles.

---

## 6. Production Audit Findings (`AUD-01` through `AUD-18`)

> **Audit Baseline & Scope Reclassification:**  
> Original strictly read-only audit was executed against commit `e778205` (with `server-field-officer.js` deleted in `c79e10b` and frontend responsiveness committed in `76cffbc`). All 18 findings (`AUD-01`–`AUD-18`) are preserved below. Per the current scope decision, **missing Admin and Driver portal modules inside `AUD-05` and `AUD-08` are reclassified as Postponed — Future Phase**, while **security/exposure defects touching current-release login, layouts, or APIs remain Active Current-Release Scope**.

### Critical Severity

#### `AUD-01`: Unauthenticated, Header-Spoofable & In-Memory Field Officer Backend
- **Severity / Scope:** **Critical** — Current Release Blocker
- **Description:** All Field Officer endpoints permit unauthenticated anonymous callers, trust client-supplied identity/sector headers, mutate non-persistent RAM arrays instead of MongoDB, and emit `403` instead of `404` on out-of-scope access.
- **Affected Files & Routes:** `backend/src/modules/fieldOfficer/fieldOfficer.routes.ts` (L22–23), `fieldOfficer.controller.ts` (L8–37), `fieldOfficer.service.ts` (L34–95), `fieldOfficer.model.ts` (unused), `backend/src/app.ts` (L99–100, L137–138); `/api/field-officer/*` and `/api/v1/field-officer/*`.
- **Evidence:** `router.use(optionalAuth)` without `requireAuth`/`roleGuard`; `getOfficerDetails` reads `x-officer-id` & `x-officer-sector`; service mutates in-memory `INITIAL_*` copies (`fieldOfficer.model.ts` never imported in `initCollections.ts`); live Render `GET https://tera360.onrender.com/api/v1/field-officer/profile` returned `HTTP 200` unauthenticated during the `e778205` audit.
- **Recommended Resolution:** Enforce `requireAuth` + `roleGuard('field_officer', 'officer', 'admin')`, remove `x-officer-id`/`x-officer-sector` header trust (derive sector from DB `User`), persist all tasks/reports/roads/alerts in MongoDB models, return `404` for out-of-scope access (PRD §13.4/§13.10), and retire unversioned `/api/field-officer`.
- **Verification Status:** **Verified** (code inspection on `76cffbc` + live Render probe reported at `e778205`).

#### `AUD-02`: Refresh Tokens Exposed in JSON Body / `localStorage` & Passwordless Demo Bypass
- **Severity / Scope:** **Critical** — Current Release Blocker
- **Description:** Refresh tokens leak out of `HttpOnly` cookie confinement into JSON responses and `localStorage`, and `api.ts` allows passwordless offline demo sessions even on non-200 HTTP failures.
- **Affected Files & Routes:** `backend/src/modules/auth/auth.controller.ts` (L36–88), `backend/src/config/env.ts` (L34), `backend/src/utils/cookie.ts` (L6–35), `frontend/src/lib/api.ts` (L107–173, L350–410); `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`.
- **Evidence:** `auth.controller.ts` sends `refreshToken` in JSON (`login` L41, `refresh` L73) and accepts body/`x-refresh-token` (`L52–55`, `L84–87`); `api.ts` saves `terra360_refresh_token` in `localStorage` (`L151`, `L357`), injects `'demo-offline-token'` on `!res.ok` if `getActiveDemoUser()` exists (`L128–135`), and authenticates without password verification on `NETWORK_ERROR` (`L362–376`); `env.ts` defaults `COOKIE_SAMESITE='none'`.
- **Recommended Resolution:** Proxy `/api/*` via `next.config.ts` `rewrites()` (or sibling subdomains) for same-origin `SameSite=Strict` cookies, stop returning/accepting `refreshToken` in JSON/headers, purge `terra360_refresh_token` and passwordless offline auth fallback from `api.ts`, and default `COOKIE_SAMESITE='strict'`.
- **Verification Status:** **Verified** (code inspection on `76cffbc`).

---

### High Severity

#### `AUD-03`: Wildcard `*.vercel.app` CORS Policy with `credentials: true` & `500` Preflight Failures
- **Severity / Scope:** **High** — Current Release Blocker
- **Description:** Backend CORS allows any arbitrary `https://*.vercel.app` origin with credentials, and throws an uncaught `Error` returning HTTP `500` for disallowed origins.
- **Affected Files & Routes:** `backend/src/app.ts` (L78–89), `backend/src/middleware/errorHandler.ts` (L13–57).
- **Evidence:** `app.ts:84` matches `/^https:\/\/.*\.vercel\.app$/` alongside `credentials: true` (`L91`) and `allowedOrigins.includes('*')` (`L83`). Rejected origins call `callback(new Error(...))` (`L88`), defaulting to `statusCode = 500` in `errorHandler.ts`. Live Render probe confirmed `204` with `Access-Control-Allow-Credentials: true` for arbitrary `https://tera360-test.vercel.app`, and `500` preflight on rejected localhost port `3010` during browser audit.
- **Recommended Resolution:** Remove wildcard `*.vercel.app` regex and `*` origin check; validate exact origins from `CORS_ORIGINS`; pass `callback(null, false)` or a `403` error for blocked origins.
- **Verification Status:** **Verified** (code inspection on `76cffbc` + live probes at `e778205`).

#### `AUD-04`: Unescaped GeoJSON HTML Interpolation (XSS Sinks) & Missing CSP
- **Severity / Scope:** **High** — Current Release Security Issue
- **Description:** `RiskMap.tsx` and `email.service.ts` interpolate unescaped dynamic strings into HTML templates/popups, and `next.config.ts` configures no `Content-Security-Policy`.
- **Affected Files & Routes:** `frontend/src/components/RiskMap.tsx` (L1589–1628, L1693–1833), `backend/src/services/email.service.ts` (L104–140), `frontend/next.config.ts` (L4–17).
- **Evidence:** `RiskMap.tsx` inserts `${id}`, `${type}`, `${location}`, `${props.depth}`, `${strain}`, `${segmentName}`, `${status}`, `${soilMoisture}`, `${poreWaterPressure}`, `${tiltRate}`, `${name}`, and `${note}` directly into `mapboxgl.Popup().setHTML(...)`, uses inline `onmouseover`/`onmouseout` (`L1735–1736`) and `btn.innerHTML` (`L1757`). `email.service.ts` interpolates `${name}` unescaped (`L111`, `L130`). `dompurify` is not installed; `next.config.ts` lacks `headers()` CSP.
- **Recommended Resolution:** Build Mapbox popups using DOM `textContent` nodes (or escape all strings / sanitize with DOMPurify), replace inline HTML handlers with JS event listeners, escape `${name}` in `email.service.ts`, and configure strict CSP headers compatible with Mapbox & Turnstile.
- **Verification Status:** **Verified** (code inspection on `76cffbc`).

#### `AUD-05`: Core Portal Workflows Missing (~75% of PRD §14.4) & Silent Mock/Static Fallbacks
- **Severity / Scope:** **High** for Current-Release Officer/Citizen/Field Portals; **Postponed — Future Phase** for Driver/Admin portals.
- **Description:** Only 5 backend collections and public/auth/contact/field-mock routes exist; Officer alert dispatch, report triage, road mutations, safe routes, villages, Citizen area/safe-place/check-in/notifications/offline PWA, telemetry ingest, and SMS/IVRS webhooks are missing or mocked.
- **Affected Files & Routes:** `backend/src/app.ts` (L131–138), `AlertReviewModal.tsx` (L50–64), `OfficerDataStatus.tsx` (L79–132), `OfficerPriorityActions.tsx` (L64–117), `officer/routes/page.tsx` (L38–78), `villagesData.ts` (L8–60), `officer/dashboard/page.tsx`, `citizen/{home,my-area,safe-place}/page.tsx`, `alerts/page.tsx`. *(Future-phase stubs: `driver/route-check/page.tsx`, `admin/users/page.tsx`.)*
- **Evidence:** `AlertReviewModal.tsx:60–62` explicitly displays `"Action Blocked: External SMS Gateway, IVRS Telephony, and alert broadcast endpoints are not deployed on this server."` `OfficerDataStatus`, `OfficerPriorityActions`, `/officer/routes`, and `/officer/villages` use hardcoded arrays (`PIPELINES`, `DEFAULT_ACTIONS`, `EMERGENCY_SAFE_ROUTES`, `MONITORED_VILLAGES`). `/alerts` silently masks failed API fetches with `FALLBACK_ALERTS` (`"35 mins ago"`).
- **Recommended Resolution:** Implement all missing Current-Scope backend modules & MongoDB collections (Alerts CRUD + `AlertDelivery` + mock/real SMS/IVRS adapters, `Report` triage + `Task`, `Road` status updates, `Village`, `Shelter`, `RiskZone`, `Notification`, `AuditLog`, Citizen `/me/*` & PWA offline bundle) and replace silent fallback masking on portals with explicit error/cached-sync states. Defer Driver & Admin backends to Future Phase.
- **Verification Status:** **Verified** (code inspection on `76cffbc` + live browser `/alerts` check at `e778205`).

#### `AUD-06`: Missing Mapbox Token, Disabled Photo Upload & Absent Turnstile Widget in Public/Citizen Reports
- **Severity / Scope:** **High** — Current Release Blocker
- **Description:** Interactive Mapbox maps fail locally without a configured token, photo uploads are local-only previews, and neither `/report` nor `ReportModal` nor `/citizen/report` renders a real Turnstile widget.
- **Affected Files & Routes:** `frontend/.env.example`, `frontend/.env.local`, `RiskMap.tsx` (L18–31), `report/page.tsx` (L412–420), `ReportModal.tsx` (L49–56, L187–188), `citizen/report/page.tsx` (L282–293), `captcha.service.ts` (L69–80).
- **Evidence:** `frontend/.env.local` has no `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`; local browser renders `"Mapbox Access Token Required"`. `/report` displays `"Cloud Storage Pending"` and has no Turnstile widget (`photoUrl: undefined`). `citizen/report/page.tsx:291–292` posts to `/api/v1/reports/public` using a hardcoded Cloudflare test token fallback (`"1x0000000000000000000000000000000AA"`), which real Turnstile rejects in production.
- **Recommended Resolution:** Render Cloudflare Turnstile widget (`NEXT_PUBLIC_CAPTCHA_SITE_KEY`) on public report forms, implement authenticated `POST /api/v1/reports` for logged-in citizens (eliminating public CAPTCHA friction), add signed cloud photo upload flow + server `uploadGuard`, and set `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` in Vercel/local env.
- **Verification Status:** **Verified** (code inspection on `76cffbc` + local `.env.local` key check + live browser check at `e778205`).

#### `AUD-07`: Field Officer Portal Split Architecture & Cross-Portal Route Inconsistency
- **Severity / Scope:** **High** — Current Release Blocker
- **Description:** Field Officer UI is split between unlinked `/field` (`field/page.tsx` calling mock `fieldOfficerApi` with hardcoded Uttarakhand pins) and sidebar-linked `/field/{tasks,map,reports,roads,alerts,profile}` (read-only `publicApi`/`reportsApi` pages with no mutations).
- **Affected Files & Routes:** `portalNavConfig.ts` (L36–49), `field/page.tsx` (L1–60, L1180–1255), `field/{tasks,map,reports,roads,alerts}/page.tsx`.
- **Evidence:** `portalNavConfig.ts` points exclusively to `/field/tasks`, `/field/map`, etc. Those pages lack task start/complete/escalate, report verify/reject/escalate, road update, or alert acknowledge mutations. Meanwhile `field/page.tsx` contains all interactive tabs wired to RAM mock `/api/field-officer/*` plus hardcoded `Rampur Upper` / `Devipura` / `Shivalik Ridge` (`[30.1482, 78.3241]`) pins.
- **Recommended Resolution:** Consolidate `/field/*` sidebar pages onto real MongoDB-backed `/api/v1/field/*` APIs, remove Uttarakhand pins, and retire/redirect `/field` to `/field/tasks`.
- **Verification Status:** **Verified** (code inspection on `76cffbc`).

#### `AUD-08`: Over-Permissive Portal Role Layouts & Ignored Nested Page `allowedRoles`
- **Severity / Scope:** **High** — Current Release Security Issue *(involves preventing `driver` & `admin` role bleed into current-scope portals)*
- **Description:** Top-level portal layouts permit broader roles than PRD §2 allows, and `PortalLayout` ignores inner page `allowedRoles` when nested.
- **Affected Files & Routes:** `citizen/layout.tsx` (L11–15), `officer/layout.tsx` (L11–15), `field/layout.tsx` (L11–15), `field/profile/page.tsx` (L30–33), `PortalLayout.tsx` (L71–74). *(Future-phase stub `driver/layout.tsx` also includes `admin`.)*
- **Evidence:** `citizen/layout.tsx` allows `["citizen", "driver", "admin"]`; `officer/layout.tsx` allows `["officer", "admin"]` (PRD §2 forbids Admin from approving Officer alerts); `field/layout.tsx` allows `["field_officer", "admin"]`; `PortalLayout.tsx:71` short-circuits before checking `ProtectedRoute` when `parentLayout.isInsidePortalLayout` is true, bypassing `field/profile/page.tsx` `allowedRoles={["field_officer"]}`.
- **Recommended Resolution:** Enforce `allowedRoles` in nested `PortalLayout` (or wrap inner `ProtectedRoute`), and restrict layouts strictly per PRD §2 (`citizen/layout` -> `["citizen"]`, `officer/layout` -> `["officer"]`, `field/layout` -> `["field_officer", "officer"]` or `["field_officer"]`).
- **Verification Status:** **Verified** (code inspection on `76cffbc`).

#### `AUD-09`: `DEMO_MODE` Active in Local Env & Hardcoded Quick-Login Seed Accounts in `AuthModal.tsx`
- **Severity / Scope:** **High** — Current Release Security Blocker
- **Description:** `login/page.tsx` enables demo mode when `NEXT_PUBLIC_DEMO_MODE=true` (present in local `.env.local`), and `AuthModal.tsx` unconditionally embeds one-click demo buttons and hardcoded seed passwords for `citizen`, `driver`, `field_officer`, and `officer` without checking any env flag.
- **Affected Files & Routes:** `frontend/src/app/login/page.tsx` (L20–86, L113–115), `frontend/src/components/modals/AuthModal.tsx` (L100–118, L223–262), `frontend/.env.local`.
- **Evidence:** `frontend/.env.local` contains `NEXT_PUBLIC_DEMO_MODE=true`. `AuthModal.tsx` has zero `isDemoModeEnabled` guard around its 1-click buttons (`L224–262`) or hardcoded password (`L106`).
- **Recommended Resolution:** Unset / enforce `NEXT_PUBLIC_DEMO_MODE=false` in production builds, remove hardcoded demo passwords and staff quick-login UI from production client bundles (gate strictly behind `NODE_ENV !== 'production' && NEXT_PUBLIC_DEMO_MODE === 'true'`).
- **Verification Status:** **Verified** (code inspection on `76cffbc` + `.env.local` key check).

#### `AUD-10`: Frontend ESLint Fails (`npm run lint`)
- **Severity / Scope:** **High** — Current Release CI/Quality Blocker
- **Description:** Repo-wide ESLint fails with 36 findings, preventing green CI checks.
- **Affected Files:** `frontend/src/__tests__/frontend-demo-mode.test.ts` (1 error), `app/login/page.tsx` (1 error), `app/officer/dashboard/page.tsx` (1 error), `app/register/page.tsx` (1 error), `components/RiskMap.jsx` (3 warnings), `components/RiskMap.tsx` (23 errors, 1 warning), `components/common/RelativeTime.tsx` (1 error), `components/layout/Header.tsx` (1 error), `components/portal/PortalLayout.tsx` (1 error), `components/ui/DropdownPortal.tsx` (1 error), `context/AppContext.tsx` (1 error).
- **Evidence:** Re-executed `cd frontend && npm.cmd run lint` directly on commit `76cffbc` -> exited `1` with **36 problems (32 errors, 4 warnings)** (slightly improved from `37 problems: 33 errors, 4 warnings` at `e778205` because `76cffbc` cleaned `OfficerLiveCorridorHud.tsx`). Dominated by `react-hooks/set-state-in-effect` and `@typescript-eslint/no-explicit-any`.
- **Recommended Resolution:** Refactor `setState`-in-effect calls (e.g., derive initial state or defer async callbacks), strongly type `RiskMap.tsx` / `frontend-demo-mode.test.ts`, and retire legacy `RiskMap.jsx`.
- **Verification Status:** **Verified** (tool execution on `76cffbc`).

#### `AUD-11`: Unsanitized `req.query`, Regex Injection, Missing Route Validation & Plaintext PII Storage
- **Severity / Scope:** **High** — Current Release Security Issue
- **Description:** Query-string NoSQL operators are not stripped, raw query values are fed into `new RegExp(...)`, two protected routes lack Zod validation, and user phone/family-contact PII is stored unencrypted.
- **Affected Files & Routes:** `backend/src/middleware/mongoSanitize.ts` (L22–26), `public.service.ts` (L73, L115, L173), `report.routes.ts` (L35–40), `report.service.ts` (L115, L127–141), `users.routes.ts` (L36), `user.model.ts` (L52–56), `env.ts` (L35–38).
- **Evidence:** `mongoSanitize` only sanitizes `req.body` and `req.params`; `public.service.ts` and `report.service.ts` execute `new RegExp(\`^${query.state.trim()}$\`, 'i')` without regex escaping; `GET /api/v1/reports` has no `validate({ query })` schema and returns `reporterPhone`; `DELETE /api/v1/users/me/sessions/:id` has no `:id` ObjectId check; `ENCRYPTION_KEY` is never referenced outside `env.ts`.
- **Recommended Resolution:** Sanitize `req.query` (or validate strictly via Zod), escape regex metacharacters (`replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`), add Zod schemas to `GET /reports` and `DELETE /users/me/sessions/:id`, mask/restrict `reporterPhone`, and encrypt `phone`/`familyContacts[].phone` with AES-256-GCM using a 64-hex `ENCRYPTION_KEY`.
- **Verification Status:** **Verified** (code inspection on `76cffbc`).

---

### Medium Severity

#### `AUD-12`: Missing Staff Invites (`POST /auth/accept-invite`), 12-Char Staff Passwords, Error Code & `emailVerified` Drift
- **Severity / Scope:** **Medium** — Current Release Auth Hardening
- **Description:** Staff invite onboarding does not exist, password minimum is 8 chars for all roles, registration returns `409` enabling email enumeration, `users.service.ts` ignores `emailVerified` for alert preferences, `requireAuth.ts` omits staff context fields, and error codes/statuses diverge from PRD §14.5.
- **Affected Files:** `auth.routes.ts`, `auth.schema.ts`, `auth.service.ts` (L34, L92, L193), `requireAuth.ts` (L34–41, L48), `users.service.ts` (L48–54).
- **Evidence:** `ACCOUNT_LOCKED` returns `401` instead of PRD `403`; auth emits `INVALID_TOKEN`, `INVALID_REFRESH_TOKEN`, `TOO_MANY_REQUESTS`, `BAD_REQUEST` instead of PRD `TOKEN_INVALID`, `REFRESH_TOKEN_INVALID`, `RATE_LIMIT_EXCEEDED`, `INVALID_REQUEST`. No `Invite` schema or `/auth/accept-invite` route exists.
- **Recommended Resolution:** Align status/error codes with PRD §14.5, enforce `emailVerified` before modifying alert preferences, populate `department`/`assignedArea` in `requireAuth.ts`, enforce 12-char passwords for staff, and implement `Invite` collection + `POST /api/v1/auth/accept-invite` (usable via seed/CLI initially while Admin UI is postponed).
- **Verification Status:** **Verified** (code inspection on `76cffbc`).

#### `AUD-13`: Weak Dev/Test Env Defaults, Missing Frontend Zod Env Validator & Missing CI/Deploy Configs
- **Severity / Scope:** **Medium** — Current Release DevOps/Deployment
- **Description:** Backend `env.ts` checks for `dev_` / default `ENCRYPTION_KEY` in prod but omits `ENCRYPTION_KEY` 64-hex length enforcement and unimplemented integration vars; `frontend/src/lib/env.ts` does not exist; no GitHub Actions CI, `.cursorignore`, `render.yaml`, or `vercel.json` exist.
- **Affected Files:** `backend/src/config/env.ts`, `backend/.env.example`, `frontend/.env.example`, repo root.
- **Evidence:** Inspected repo root (`git ls-files`) and `frontend/src/lib/` (`api.ts`, `fallbackData.ts` only); `frontend/.env.example` lacks `NEXT_PUBLIC_CAPTCHA_SITE_KEY` and `NEXT_PUBLIC_DEMO_MODE`.
- **Recommended Resolution:** Enforce 64-hex `ENCRYPTION_KEY` & production secret validation, create `frontend/src/lib/env.ts` with Zod, update `.env.example` files, and add `.github/workflows/ci.yml` + `.cursorignore` + deployment manifests.
- **Verification Status:** **Verified** (filesystem & code inspection on `76cffbc`).

#### `AUD-14`: Public Risk Map & Contact Form PRD Behavioral Mismatches
- **Severity / Scope:** **Medium** — Current Release Functionality
- **Description:** `GET /api/v1/public/risk-map` does not filter `isMajorNH: true` or serialize GeoJSON `FeatureCollection`, and `POST /api/v1/contact` persists to MongoDB without sending email via `emailService`.
- **Affected Files:** `backend/src/modules/public/public.service.ts` (L70–94), `backend/src/modules/contact/contact.service.ts` (L24–53).
- **Evidence:** `public.service.ts:71` queries `{ isDeleted: false }` without `isMajorNH: true`; `contact.service.ts` never imports `emailService`.
- **Recommended Resolution:** Add `isMajorNH: true` + optional bbox filter / GeoJSON contract alignment on `/public/risk-map`, and dispatch an escaped notification email via `emailService` on contact submit.
- **Verification Status:** **Verified** (code inspection on `76cffbc`).

#### `AUD-15`: `uploadGuard.ts` Unmounted Header-Only Guard, Rate-Limit Drift & Missing Observability/Cron
- **Severity / Scope:** **Medium** — Current Release Infrastructure/Security
- **Description:** `uploadGuard.ts` is unused and checks headers only (no magic bytes/EXIF stripping); `authLimiter` (`15/min` without `skipSuccessfulRequests: true`) and `globalApiLimiter` (`150/min`) differ from PRD (`10/min` & `100/min`); `server.ts` has no `cron.service.ts`, Winston redacting logger, or Sentry integration.
- **Affected Files:** `backend/src/middleware/uploadGuard.ts`, `backend/src/app.ts` (L116–129), `backend/src/modules/auth/auth.routes.ts` (L16–28), `backend/src/server.ts`.
- **Recommended Resolution:** Wire real file upload/magic-byte validation & EXIF stripping, align limiter thresholds (`10/min skipSuccessfulRequests: true` for auth, `100/min` global), and add redacting Winston logging + Sentry + cron jobs.
- **Verification Status:** **Verified** (code inspection on `76cffbc`).

#### `AUD-16`: Login Ignores `?redirect=` Param on Submit; Subpage Header Uses `/#...`; Missing 404/Error Pages
- **Severity / Scope:** **Medium** — Current Release UX/Routing
- **Description:** Submitting `/login?redirect=%2Fofficer%2Falerts` pushes `getRolePortalPath(role)` instead of honoring `redirectParam`; off-home Header links use `/#home`, `/#risk-map`, `/#alerts`, `/#about`, `/#report` rather than dedicated routes (and home has no `#about`, falling back to `#how-it-works`); no custom `not-found.tsx` or `error.tsx` exists.
- **Affected Files:** `frontend/src/app/login/page.tsx` (L147–165), `frontend/src/components/layout/Header.tsx` (L16–22, L69–70), `frontend/src/app/`.
- **Recommended Resolution:** Honor safe same-origin relative `redirectParam` on form submit, add branded `not-found.tsx` and `error.tsx`, and route off-home Header links to standalone pages (`/risk-map`, `/alerts`, `/about`, `/report`).
- **Verification Status:** **Verified** (code inspection on `76cffbc` + live DevTools check at `e778205`).

#### `AUD-17`: Accessibility Form Label/Autocomplete Defects & Hardcoded Header/Dashboard Values
- **Severity / Scope:** **Medium** — Current Release UI/Accessibility
- **Description:** `/report` triggers DevTools accessibility issues (unassociated `<label>` tags on hazard button group and photo dropzone, missing `autoComplete`), `PortalHeader.tsx` hardcodes `unreadCount = 0`, and `officer/dashboard/page.tsx` hardcodes `villagesAtRiskCount = 2`.
- **Affected Files:** `frontend/src/app/report/page.tsx` (L356–420), `frontend/src/components/portal/PortalHeader.tsx` (L77), `frontend/src/app/officer/dashboard/page.tsx` (L122).
- **Recommended Resolution:** Replace non-control `<label>` wrappers with `<fieldset>/<legend>` or properly `htmlFor`-bound inputs with `autoComplete`, and wire notification counts & village risk counts to live backend endpoints.
- **Verification Status:** **Verified** (code inspection on `76cffbc` + DevTools audit at `e778205`).

---

### Low Severity

#### `AUD-18`: Duplicate Legacy JS/JSX Files, Image Preload Warnings & Minor Schema/Style Drifts
- **Severity / Scope:** **Low** — Current Release Hygiene
- **Description:** Legacy JS/JSX files remain alongside active TypeScript code; `Footer.tsx`/`PortalFooter.tsx` and `Header.tsx` set `priority` on images causing unused preload warnings in DevTools; minor enum drifts (`Road.riskLevel` `'Moderate'` vs `'Medium'`, `Report.status` `'submitted'`/`'rejected'` vs `'new'`/`'false_alarm'`, `globals.css` using Geist instead of Poppins/Inter/Noto Sans).
- **Affected Files:** `backend/server.js`, `backend/field_officer.js`, `backend/controllers/fieldOfficerController.js`, `backend/routes/fieldOfficerRoutes.js`, `frontend/src/App.jsx`, `frontend/src/components/RiskMap.jsx`, `Footer.tsx`, `PortalFooter.tsx`, `PortalHeader.tsx`, `globals.css`. *(Note: root `server-field-officer.js` flagged in the `e778205` audit has since been **deleted** in commit `c79e10b`.)*
- **Recommended Resolution:** Archive/remove superseded JS/JSX files, tune `priority` image attributes, and align enum names if updating backend schemas for Officer/Field modules.
- **Verification Status:** **Verified** (code inspection on `76cffbc`; `server-field-officer.js` removal verified in `c79e10b`).

---

## 7. Current Development Activities

### 7.1 Recent Multi-Agent Session History (2026-11-10)
The workspace underwent rapid parallel and sequential AI-assisted development on 2026-11-10. Recorded local Antigravity conversation IDs (`C:\Users\Administrator\.gemini\antigravity\brain\<id>`) for traceability:

1. **Responsiveness Optimization Agent (`81f3f92c-e0cf-4bdd-a1f4-d66b2d74f573`) — COMPLETED & PUSHED:**
   - Worked concurrently after the audit baseline (`e778205`) from 20:01–20:31 IST.
   - Optimized responsive breakpoints (`375px`–`1920px`) across **40 frontend files**, rebased onto `c79e10b`, and committed/pushed **`76cffbc`** (`fix(ui): optimize responsiveness across all Terra360 views and portals`).
2. **Production Readiness Audit Agent (`83739ac5-07d3-4d7a-8200-b1350a7337fa`) — COMPLETED (READ-ONLY REPORT):**
   - Earlier in the same session, merged `origin/Disha` (`2e3256a`) and `origin/Samrudhi` (`e778205`), refined the Villages page & overall Officer UI consistency, and then executed the read-only production readiness audit against `e778205` (with read-only subagents `f64cc23c-c1c8-4d59-9192-2f850968f0d5` and `4a90a2c0-86de-483b-8b07-b0b3fa78851a`), producing findings `AUD-01`–`AUD-18`.
3. **Earlier UI Redesign & Integration Sessions (2026-11-09 to 2026-11-10):**
   - `aee65da4`: Redesigned 5 Officer Dashboard KPI cards & Recent AI Risk Updates (compact + expanded timeline).
   - `52237160`: Redesigned Officer Priority Action List table with bulk controls.
   - `18ee842a`: Redesigned Rainfall & SAR-Data Ingestion 3-card grid & footer split horizon.
   - `f210dc51`: Redesigned Officer Dashboard mini risk map & Road Impact cards/rows.
   - `4803ad36`: Redesigned `/officer/map` & harmonized KPI card design across Alert Center, Safe Routes, Villages, Field Reports.
   - `d99bc847`: Redesigned `/officer/alerts` (`AlertSectionBanner`, `AlertComposer`, `AlertHistoryFeed`).
   - `aaf5580e`, `c9847eab`, `1c7d6008`, `b232628b`, `b710d9fb`, `1298c7bc`: Shared `PortalLayout` rollout, Officer portal tabs, auth/demo fixes.

### 7.2 Unfinished Tasks & Working-Tree Status
- **Working Tree Status:** As of commit `76cffbc`, all application source files are clean (`nothing to commit` prior to creating `docs/ANTIGRAVITY_HANDOFF.md`).
- **Untracked Handoff Artifact:** `docs/ANTIGRAVITY_HANDOFF.md` is intentionally untracked and **must not be committed to GitHub**.
- **Unfinished Remediation Work:** None of the `AUD-01` through `AUD-18` remediation tasks (Phase 0–3) have been started yet.

### 7.3 Concurrent Development & Merge Risks
- **Unlinked Field Officer Monolith:** `frontend/src/app/field/page.tsx` vs `frontend/src/app/field/{tasks,map,reports,roads,alerts}/page.tsx` — editing one without consolidating risks breaking Field Officer workflows.
- **Duplicate Legacy Files:** Legacy `RiskMap.jsx`, `App.jsx`, `backend/server.js`, `backend/field_officer.js`, `backend/routes/fieldOfficerRoutes.js`, `backend/controllers/fieldOfficerController.js` can confuse agents searching by filename.
- **Stale Local Branches:** Local branches `Disha` and `samrudhi` still point to Nov 9 merge commits; future pulls/merges should target `main`.
- **Scope Creep Risk:** `/driver/route-check` and `/admin/users` exist as stubs and appear in `portalNavConfig.ts` and `login/page.tsx`; future agents must not spend effort expanding them unless explicitly instructed.

---

## 8. Git and Collaboration

*(Verified directly via `git status`, `git branch -a`, `git for-each-ref`, `git log`, `git merge-base`, and `git shortlog` on 2026-11-10.)*

- **Remote:** `origin` -> `https://github.com/PranavN145/Tera360.git`
- **Current Branch:** `main` (tracking `origin/main`, up to date)
- **Latest Commits on `main`:**
  - `76cffbc` *(HEAD -> `main`, `origin/main`, `origin/HEAD`)* — `fix(ui): optimize responsiveness across all Terra360 views and portals` (40 frontend files, `+464 / -295`, 2026-11-10 20:31 +0530)
  - `c79e10b` — `Delete server-field-officer.js` (2026-11-10 19:48 +0530)
  - `e778205` — `Merge Samrudhi Updates` (2026-11-10 19:46 +0530)
  - `2e3256a` — `Merge Disha Updates`
  - `e53f9d4` — `Merge Field Officer`
  - `e0b0590` — `Merge Disha Updates`

### Branch & Merge Status Matrix (Verified via `git log main..<branch>` & `git merge-base`)
| Branch | Head SHA | Last Author / Date | Ahead of `main`? | Verification |
|---|---|---|---|---|
| `main` / `origin/main` | `76cffbc` | Pranav Narkhede (2026-11-10) | Active HEAD | Clean working tree (only untracked `docs/ANTIGRAVITY_HANDOFF.md`) |
| `origin/Disha` | `46360bd` | Disha-Patharkar22 (2026-11-10) | **0 commits** | Merged into `main` at `2e3256a` (`git log main..origin/Disha` empty) |
| `origin/Fieldofficer` | `5b49add` | Khush Patil (2026-11-10) | **0 commits** | Merged into `main` at `e53f9d4` (`git log main..origin/Fieldofficer` empty) |
| `origin/Samrudhi` | `9dd79b4` | samrudhi-project1234 (2026-11-10) | **0 commits** | Merged into `main` at `e778205` (`git log main..origin/Samrudhi` empty) |
| `origin/Khush` | `da83c6a` | Pranav Narkhede (2026-11-09) | **0 commits** | Ancestor of `main` (`git log main..origin/Khush` empty) |
| `pranav` / `origin/pranav` | `1f50fd1` | Pranav Narkhede (2026-11-09) | **0 commits** | Ancestor of `main` (`git log main..origin/pranav` empty) |
| `Disha` *(local only)* | `2b4c92c` | Pranav Narkhede (2026-11-09) | 1 empty merge commit (`8452fc9`+`f58ec0a`) | Tree/parents verified ancestors of `main` (`git merge-base --is-ancestor` = 0); safe to ignore/delete locally |
| `samrudhi` *(local only)* | `b6639fb` | Pranav Narkhede (2026-11-09) | 1 empty merge commit (`d706df4`+`6267443`) | Tree/parents verified ancestors of `main` (`git merge-base --is-ancestor` = 0); safe to ignore/delete locally |

### Teammate Contributions (`git shortlog -sn main`)
- `Pranav Narkhede` (29 commits) — Backend auth/tombstone security, public APIs, Officer portal, GIS unification, branch merges, responsiveness commit.
- `Disha-Patharkar22` / `Disha Girish Patharkar` (12 commits) — Mapbox 3D GIS (`RiskMap`), telemetry synchronization, report/map fixes.
- `samrudhi-project1234` / `Samrudhi Shinde` (7 commits) — Public website alerts/risk-map/footer UI updates.
- `Khush Patil` (4 commits) — Field Officer portal (`field/page.tsx`, `fieldOfficer.*` module, `field_officer_collection.json`).

---

## 9. Deployment and Known Issues

### 9.1 Current Deployment Status
- **Backend (Render):** Live at `https://tera360.onrender.com`.
  - **Verified Live (2026-11-10 20:33 IST):** `GET /health` -> `200` (`status: "healthy"`, `uptime: 2764.96s`); `GET /ready` -> `200` (`status: "ready"`, `database: "connected"`, `databaseName: "Terra360"`).
  - **Live Risks Verified in Audit:** `/api/v1/field-officer/profile` returns `200` without authentication (`AUD-01`); `*.vercel.app` wildcard CORS is enabled with credentials (`AUD-03`); Field Officer RAM state resets on Render sleep/restart; Render deployment is still serving code prior to or matching recent `backend/` state (note `backend/` was unchanged in `76cffbc`/`c79e10b`).
- **Frontend (Vercel):** Configured for Next.js `16.4.5` in `frontend/`.
  - **Production Build Verified Locally (2026-11-10):** `npm run build` passes (`41/41` static routes); `npx tsc --noEmit` passes (`exit 0`).
  - **Not Verified:** Live Vercel production URL, Vercel environment variable values, and whether Vercel auto-deployed `76cffbc`.
- **Database (MongoDB Atlas):** Connected to database `Terra360` (confirmed via Render `/ready`). Local MongoDB is not running on the developer workstation; live DB-mutating integration tests were withheld to protect Atlas data.

### 9.2 Required Production Environment Variables (Names Only)
- **Render (Backend):** `NODE_ENV` (`production`), `PORT`, `MONGODB_URI`, `JWT_ACCESS_SECRET` (64+ hex), `JWT_REFRESH_SECRET` (distinct 64+ hex), `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `CLIENT_URL`, `CORS_ORIGINS` (exact origin list, no `*`), `COOKIE_DOMAIN`, `COOKIE_SAMESITE` (`strict` if proxied via Next.js `/api/*` rewrite, or `none` only if cross-site HTTPS), `ENCRYPTION_KEY` (64 hex chars once implemented), `CLOUDFLARE_TURNSTILE_SECRET_KEY`, `TRUST_PROXY` (`1` on Render), `ALLOWED_PHOTO_DOMAINS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, plus future `SENTRY_DSN`, `MODEL_INGEST_TOKEN`, `SMS_*`, `IVRS_*`, `STORAGE_*`.
- **Vercel (Frontend):** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`, `NEXT_PUBLIC_CAPTCHA_SITE_KEY` (once Turnstile widget is added), `NEXT_PUBLIC_DEMO_MODE` (`false` or unset — **must NOT be `true`**), plus future `NEXT_PUBLIC_SENTRY_DSN`.

### 9.3 Current Verification Snapshot (Executed Directly on `76cffbc`)
| Check | Command | Result |
|---|---|---|
| Backend TypeScript | `cd backend && npm run type-check && npm run type-check:tests` | **Passed** (`exit 0`) |
| Backend Build | `cd backend && npm run build` | **Passed** (`exit 0`) |
| Backend Auth Suite | `cd backend && npm test` (`auth.test.ts`) | **Passed: 37/37** (no DB required; `/ready` 503 expected) |
| Backend Models Suite | `cd backend && npm run test:models` (`models.test.ts`) | **Passed: 12/12** |
| Backend Field Officer Suite | `cd backend && npm run test:field-officer` (`fieldOfficer.test.ts`) | **Passed: 21/21** *(tests RAM mock service & non-PRD `403`)* |
| Backend DB Integration Suites | `test:public`, `test:write`, `test:e2e`, `session-lifecycle`, etc. | **Not Executed** (requires running MongoDB; targets `MONGODB_URI` in `.env`) |
| Frontend TypeScript | `cd frontend && npx tsc --noEmit` | **Passed** (`exit 0`) |
| Frontend Build | `cd frontend && npm run build` | **Passed** (`41/41` routes built) |
| Frontend Demo Suite | `cd frontend && npx tsx src/__tests__/frontend-demo-mode.test.ts` | **Passed: 7/7** |
| Frontend ESLint | `cd frontend && npm run lint` | **FAILED** (`exit 1` — **32 errors, 4 warnings**) |

---

## 10. Pending Work and Recommended Roadmap

### 10.1 Critical Security Fixes (Immediate — Before Any Public/Production Use)
1. **Lock down Field Officer backend (`AUD-01`):** Replace `optionalAuth` with `requireAuth` + `roleGuard('field_officer', 'officer', 'admin')`; strip `x-officer-id`/`x-officer-sector` headers; migrate `fieldOfficer.service.ts` onto MongoDB models (`FieldOfficerTaskModel`, `RoadStatusUpdateModel`, `AlertAcknowledgmentModel` + `Report` + `Road`); return `404` on out-of-scope access.
2. **Eliminate refresh token exposure & passwordless demo bypass (`AUD-02`, `AUD-09`):** Add Next.js `/api/:path*` rewrite proxy in `frontend/next.config.ts` so auth cookies are same-origin; default `COOKIE_SAMESITE='strict'`; remove `refreshToken` from login/refresh JSON bodies and `localStorage`; delete `'demo-offline-token'` and passwordless `NETWORK_ERROR`/non-200 auth fallbacks; remove hardcoded demo passwords/1-click buttons from `AuthModal.tsx` and guard dev login strictly behind `NODE_ENV !== 'production'`; set `NEXT_PUBLIC_DEMO_MODE=false` in `.env.local` / Vercel.
3. **Eliminate XSS sinks & add CSP (`AUD-04`):** Sanitize/escape all GeoJSON properties in `RiskMap.tsx` popups (prefer DOM `textContent` nodes), remove inline `onmouseover`/`onmouseout` and `btn.innerHTML`, escape `${name}` in `email.service.ts`, and configure strict CSP headers in `next.config.ts`.
4. **Restrict CORS & fix preflight 500 (`AUD-03`):** Remove `/^https:\/\/.*\.vercel\.app$/` and `*` trust from `app.ts`; reject disallowed origins cleanly (`403` or `callback(null, false)`).

### 10.2 Authentication & Authorization Fixes
5. Tighten frontend route guards (`AUD-08`): Fix `PortalLayout.tsx` so nested pages' `allowedRoles` are enforced; restrict `citizen/layout.tsx` to `["citizen"]` and `officer/layout.tsx` to `["officer"]`.
6. Implement `Invite` model + `POST /api/v1/auth/accept-invite`, enforce 12-char staff password length, require `emailVerified` before modifying alert preferences, populate `department`/`assignedArea` in `requireAuth.ts`, and normalize PRD §14.5 error codes (`403 ACCOUNT_LOCKED`, `TOKEN_INVALID`, `REFRESH_TOKEN_INVALID`, `RATE_LIMIT_EXCEEDED`, `INVALID_REQUEST`) (`AUD-12`).
7. Fix `/login` post-submit handling to honor safe same-origin `?redirect=` params (`AUD-16`), and fix `register/page.tsx:41` role redirect (`getRolePortalPath`).

### 10.3 Backend & Database Corrections
8. Sanitize `req.query` in `mongoSanitize.ts`, escape regex characters in `public.service.ts` & `report.service.ts`, add Zod query/params validation to `GET /api/v1/reports` and `DELETE /api/v1/users/me/sessions/:id`, and stop returning `reporterPhone` unnecessarily (`AUD-11`).
9. Implement AES-256-GCM encryption (`ENCRYPTION_KEY` 64 hex chars) for `User.phone` and `User.familyContacts[].phone` (`AUD-11`).
10. Update `GET /api/v1/public/risk-map` to filter `isMajorNH: true` and return GeoJSON/bbox filtering per PRD, wire `emailService` into `contact.service.ts`, align `authLimiter` (`10/min`, `skipSuccessfulRequests: true`) and `globalApiLimiter` (`100/min`), and mount `uploadGuard.ts` with magic-byte + EXIF stripping (`AUD-14`, `AUD-15`).

### 10.4 Missing Current-Scope Functionality
11. **Officer Operational APIs (`AUD-05`):** Build `Alert` lifecycle (`POST /alerts`, `preview`, `approve` with Critical confirm, `cancel`, `deliveries`, `retry-failed`, `AlertDelivery`, `AuditLog`), `SMS`/`IVRS` provider adapters (mock + sandbox), `Road` status mutation (`PATCH /roads/:id/status`), rule-based `triage.service.ts` + `PATCH /reports/:id/status` + `POST /tasks`, `Village`/`Shelter`/`RiskZone`/`SafeRoutes` endpoints, and `GET /officer/dashboard`.
12. **Citizen Portal & Offline PWA (`AUD-05`):** Build `GET /me/area`, `GET /me/area/map`, `GET /me/safe-place`, `GET /me/offline-bundle`, `POST /reports` (authenticated citizen report), `POST /me/checkin`, `GET/PATCH /notifications`, `manifest.json`, service worker, and IndexedDB offline sync queue (zero tokens stored offline).
13. **Telemetry Ingestion & Scheduling:** Implement `POST /api/v1/internal/model-runs` (`MODEL_INGEST_TOKEN` + `safeCompare`), `POST /api/v1/webhooks/{sms,ivrs}`, `cron.service.ts`, `data/master_dataset.csv` alignment, and real Turnstile widget + signed cloud photo uploads (`AUD-06`).

### 10.5 Frontend Functionality & Integration
14. Consolidate `/field/*` sidebar pages onto real MongoDB-backed `/api/v1/field/*` endpoints, wire task/report/road/alert action buttons, and remove Uttarakhand pins (`AUD-07`).
15. Connect `OfficerDataStatus`, `OfficerPriorityActions`, `/officer/routes`, `/officer/villages`, `PortalHeader` notification badge, and `officer/dashboard` `villagesAtRiskCount` to live backend APIs instead of hardcoded arrays (`AUD-05`, `AUD-17`).
16. Replace silent `FALLBACK_*` masking on `/alerts` and portal views with explicit error/retry + offline-sync indicators.

### 10.6 Responsive Design
17. Provision `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` and visually verify live WebGL Mapbox marker/corridor/detour click popups across `375px`, `768px`, and `1440px` (`RiskMap.tsx` popup responsiveness was coded in `76cffbc` without a live Mapbox token).

### 10.7 UI/UX Consistency & Accessibility
18. Fix `/report` `<label>`/`htmlFor` and `autoComplete` accessibility issues (`AUD-17`), add branded `not-found.tsx` and `error.tsx` (`AUD-16`), update off-home public `Header.tsx` links to point directly to `/risk-map`, `/alerts`, `/about`, `/report`, and resolve unused image `priority` preload warnings (`AUD-18`).
19. Remove/archive legacy `RiskMap.jsx`, `App.jsx`, `backend/server.js`, `backend/field_officer.js`, `backend/controllers/fieldOfficerController.js`, `backend/routes/fieldOfficerRoutes.js` (`AUD-18`).

### 10.8 Testing, CI/CD & Production Deployment
20. Fix all **32 ESLint errors & 4 warnings** (`AUD-10`) so `npm run lint` exits `0`.
21. Add `frontend/src/lib/env.ts` Zod validator, tighten `backend/src/config/env.ts`, add Winston redacting logs + `@sentry/node` / `@sentry/nextjs` (`AUD-13`, `AUD-15`).
22. Create `.github/workflows/` CI (install, lint, `tsc`, unit tests, build, `npm audit`) and `.cursorignore`; run integration tests against a dedicated **local or staging MongoDB** (never live Atlas); redeploy Render & Vercel with production env variables and run live smoke verification.

### 10.9 Future-Phase Work (Postponed — Do Not Start Unless Requested)
- Expand **Driver Portal** (`/driver/alerts`, `/driver/map`, `/driver/report`, `/driver/profile` + `POST /api/v1/driver/route-check`, `/driver/routes`, `/driver/alerts`).
- Expand **Admin Console** (`/admin/roles`, `/admin/districts`, `/admin/areas`, `/admin/templates`, `/admin/data-sources`, `/admin/model-runs`, `/admin/logs` + `/api/v1/admin/*`).
- P3 features: Citizen volunteer verification network, ML report triage model, Web Push notifications, audio voice-note uploads, full i18n (`next-intl` + Indic Noto Sans fonts).

---

## 11. Instructions for the Next AI Agent

1. **Always Inspect Current Code First:** Never rely solely on this document or chat summaries. Read the exact target files before modifying anything.
2. **Preserve Working Functionality & Approved Designs:** Keep existing auth tombstone rotation, public read/report APIs, Mapbox 3D GIS engine (`RiskMap.tsx`), `#173D32`/`#DCE8D4`/`#D6A65D`/`#F6F4EC` design tokens, and the approved Officer Dashboard/Map/Roads/Alerts/Villages designs and responsive breakpoints (`76cffbc`) intact unless fixing a specific bug/API hookup.
3. **Respect Current Scope Boundaries:** **Do NOT implement Admin (`/admin/*`) or Driver (`/driver/*`) portals or backends** unless the user explicitly instructs you to do so.
4. **Never Invent APIs, Data, or Passing Tests:** If an endpoint or integration does not exist yet (e.g., `/api/v1/alerts`, SMS/IVRS, cloud photo storage), state so clearly or build it properly—never fabricate test results or fake silent success responses.
5. **Never Expose or Commit Secrets or Handoff Docs:**
   - Never print, log, or commit `backend/.env`, `frontend/.env.local`, API tokens, database URIs, or credentials.
   - **Never `git add` or `git commit` `docs/` or `docs/ANTIGRAVITY_HANDOFF.md`.**
6. **Protect Git History & Other Agents' Work:** Always run `git status` and `git branch -a` before editing. Never force-push, reset, or discard changes blindly. Note that `backend/src/tests/*` integration tests (`test:public`, `test:write`, `test:e2e`, `session-lifecycle`, etc.) connect to `MONGODB_URI` in `backend/.env` and call `deleteMany` — **never run them against production MongoDB Atlas**.
7. **Verify After Every Change:** Run and confirm real outputs for:
   - `cd backend && npm run type-check && npm run type-check:tests && npm run build`
   - `cd backend && npm test && npm run test:models` (offline safe)
   - `cd frontend && npx tsc --noEmit && npm run lint && npm run build`
8. **Ask Approval Before Major Architectural Changes:** Before changing auth/cookie topology (e.g., Next.js proxy vs subdomain cookies), modifying database schemas in Atlas, or deleting legacy files, confirm with the user first.

