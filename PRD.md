# Terra360 — Product Requirements Document & Project Blueprint

### Landslide Early-Warning Platform for Northeast India
### Next.js + Tailwind CSS · Node.js/Express · MongoDB · Email Auth

> **Version:** 1.0 (draft for review)
> **Date:** 6 November 2026
> **Source:** `plan.excalidraw` (pages, features, design assets) + `PROJECT_BLUEPRINT.md` v2.2 (structure, security, prompt standards)
> **Audience:** Solo developer, AI coding assistants (Cursor, Copilot, Claude), reviewers, non-technical stakeholders
> **Purpose:** Single source of truth for what Terra360 is, who it serves, what each page does, how it is built, and how it is secured.

---

## ⚠️ Version Safety Rule (Read First)

> **Never copy version numbers from this document (or from memory) into `package.json`.** Old pins stay vulnerable; docs go stale the day they ship. This PRD intentionally contains **no dependency versions**.

### For humans

1. Open [npmjs.com](https://www.npmjs.com/) for each package. Confirm **latest** and read any advisory links.
2. Prefer the **newest patched release** on a supported major line.
3. After install, run `npm audit` and fix **high/critical** issues before shipping.

```bash
npm show <package-name> version          # latest published
npm view <package-name> time.modified    # how fresh "latest" is
npm audit                                # installed tree
```

### For AI assistants (mandatory)

Before you write or edit `package.json`, `package-lock.json`, or recommend install commands:

1. **Web search** each non-trivial dependency: `"npm <package> latest version"` and `"<package> npm security advisory"` / `"<package> CVE"`. For Node.js, search the current **Active LTS**.
2. Cross-check with `npm show <package> version` when a shell is available.
3. If `latest` has an unpatched CVE, find the patched version or pick an alternative.
4. In your reply, **state what you verified**. Do not invent versions.
5. Use `^` ranges for app dependencies unless you have a documented reason to pin.

**Packages to verify (names only, no versions):** `next`, `react`, `react-dom`, `tailwindcss`, `express`, `mongoose`, `zod`, `jsonwebtoken`, `bcryptjs`, `helmet`, `cors`, `express-rate-limit`, `express-mongo-sanitize`, `cookie-parser`, `nodemailer`, `winston`, `@sentry/node`, `@sentry/nextjs`, `socket.io` (optional), `node-cron`, `@tanstack/react-query`, `axios`, `react-hook-form`, `dompurify`, a map library (MapLibre GL JS or Leaflet), and an SMS/IVRS provider SDK.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Users & Roles](#2-users--roles)
3. [Goals, Non-Goals & Success Metrics](#3-goals-non-goals--success-metrics)
4. [Scope & Release Phases](#4-scope--release-phases)
5. [Website Structure & Sitemap](#5-website-structure--sitemap)
6. [Feature Requirements by Portal](#6-feature-requirements-by-portal)
7. [Cross-Cutting Features](#7-cross-cutting-features)
8. [Design System & Brand](#8-design-system--brand)
9. [Tech Stack](#9-tech-stack)
10. [Repository Structure](#10-repository-structure)
11. [Environment Variables](#11-environment-variables)
12. [Data Model](#12-data-model)
13. [Backend Architecture](#13-backend-architecture)
14. [API Documentation Standard & Endpoint Catalog](#14-api-documentation-standard--endpoint-catalog)
15. [Backend Security Checklist](#15-backend-security-checklist)
16. [Frontend Architecture](#16-frontend-architecture)
17. [Frontend Security Checklist](#17-frontend-security-checklist)
18. [Non-Functional Requirements](#18-non-functional-requirements)
19. [AI Workflow, CI & Git Hygiene](#19-ai-workflow-ci--git-hygiene)
20. [Postman & Testing Guide](#20-postman--testing-guide)
21. [Master Prompts](#21-master-prompts)
22. [Milestones](#22-milestones)
23. [Risks & Open Questions](#23-risks--open-questions)
24. [Document Maintenance](#24-document-maintenance)

---

## 1. Product Overview

### 1.1 What is Terra360?

Terra360 is a **landslide early-warning web app for Northeast India**. It watches dangerous hills using **satellite radar (SAR), rainfall data and AI**, predicts where a landslide may happen, shows which **roads or villages** could be affected, and sends alerts to people, including through **IVRS voice calls, SMS, and offline mode** when the internet fails.

SAR satellites can detect tiny ground movement even through cloud cover, which matters during the monsoon, when optical satellites are blind.

### 1.2 The problem

- Landslides in the region block national highways and cut off villages, often with little warning.
- Villagers, drivers and rescue teams rarely get **location-specific, actionable, local-language** warnings in time.
- Internet and mobile data fail exactly when danger peaks (heavy rain), so app-only alerts are not enough.
- Early physical signs (cracks, tilting trees, muddy water) are seen by locals first, but there is no structured way to report and verify them.

### 1.3 The solution (one paragraph)

Terra360 turns satellite, rainfall and slope data into **risk zones** (Low / Medium / High / Critical), overlays them on **roads and villages**, lets **Disaster Management Officers** review and approve **Watch / Warning / Critical alerts**, and delivers them to the right audience by **app notification, SMS and IVRS voice call**. **Citizens and Field Officers** feed ground truth back through reports, which are triaged so false alarms do not overwhelm responders.

### 1.4 One-line value statement

> *Terra360 helps villagers, drivers and rescue teams know landslide danger before it blocks roads or puts lives at risk.*

---

## 2. Users & Roles

| Role (DB value) | Who | What they need to do |
|---|---|---|
| `officer` | **Disaster Management Officer** | View risk map, approve alerts, identify affected roads/villages, plan safe response routes, dispatch teams |
| `citizen` | **Citizen (normal user / villager)** | Receive IVRS voice call, SMS or app alert; view evacuation / safe-location guidance; optionally report danger signs |
| `driver` | **Driver / Commuter (transportation)** | Check route risk, receive road-risk warnings, view alternate route |
| `field_officer` | **Field Officer (any inspector)** | View slope-risk layer, receive inspection alerts, confirm/update road status, report hill-cutting or visible cracks |
| `admin` | **Admin** | Manage users, roles, districts, areas, alert templates, data sources, model runs, logs |
| *(none)* | **Public visitor** | See home page, public risk-map preview, published alerts, submit a danger report, learn about Terra360 |

### Role permission summary

| Capability | Public | Citizen | Driver | Field Officer | Officer | Admin |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| View public risk-map preview (major NH only) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View published alerts | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Submit danger report | ✅ (rate-limited) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Own-village risk, safe place, offline cache | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Route risk & alternate route | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Slope-risk layer, tasks, road-status updates | ❌ | ❌ | ❌ | ✅ (assigned area) | ✅ | ✅ |
| Full live risk map, all layers | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Create / approve / send alerts | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Triage reports, assign tasks, mark road blocked | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage users, templates, data sources, model runs | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

> Assumption: Admin manages the platform but does **not** approve live alerts. That stays with the Disaster Management Officer for accountability. Change this if your department wants otherwise.

---

## 3. Goals, Non-Goals & Success Metrics

### Goals

1. **Early, location-specific warning** for villages and road corridors in Northeast India.
2. **Multi-channel delivery** so alerts still reach people without internet (SMS, IVRS voice, cached offline guidance).
3. **Human-in-the-loop alerting**: AI proposes, an officer approves.
4. **Ground-truth loop**: citizen and field reports verify or refute model output.
5. **Simple for villagers**: icon-based, plain-language, local-language UI.

### Non-goals (for the prototype)

- Nationwide coverage. The prototype covers **major National Highways only** in the public map.
- Building the SAR/rainfall ML pipeline itself inside the Express app. Terra360 **ingests model outputs** (see [§13.5](#135-data-ingestion--model-runs)).
- Native mobile apps. The web app is a **PWA** with offline support.
- Automated alerts without officer approval.

### Success metrics (targets to confirm with stakeholders)

| Metric | Target |
|---|---|
| Alert approval → first delivery (any channel) | ≤ 2 minutes |
| Alert delivery success across SMS / IVRS | ≥ 90% attempted recipients reached |
| Report triage: High-priority reports seen by an officer | ≤ 5 minutes |
| Public pages Largest Contentful Paint (4G) | ≤ 2.5 s |
| Citizen "My area" page usable offline after one online visit | 100% of cached villages |
| Zero high/critical `npm audit` findings at release | Required |

---

## 4. Scope & Release Phases

| Phase | Portals / features | Notes |
|---|---|---|
| **P0 — Foundation** | Repo, CI, env validation, email auth, roles, design system, health endpoints | Needed by everything |
| **P1 — MVP (prototype)** | Public Website, **Officer Portal**, **Citizen Portal**, **Field Officer Portal** | The four portals fully designed in the plan |
| **P2 — Optional** (`**` in plan) | **Driver / Commuter Portal**, **Admin Portal** | "Implement only if time permits" |
| **P3 — Excess features** | Citizen early-warning network, AI report triage, shelter & evacuation intelligence | Listed in plan as "excess features we can add"; triage and shelters are partly built into P1 |

> **Note on "Optional for now" in the plan:** an annotation near the Officer portal says *"Optional for now, can work on it if time permits."* Its position is below the Villages/Population and Field Reports blocks, so it is unclear which block it targets. This PRD treats both as **P1 stretch** (build after Dashboard, Live Risk Map, Road Impact and Alert Center). See [§23](#23-risks--open-questions).

---

## 5. Website Structure & Sitemap

```
Terra360
├── Public Website
│   ├── Home
│   ├── Risk Map (Public Preview)         → major NH only
│   ├── Alerts
│   ├── Report                            → report danger
│   ├── About / Contact
│   └── Login / Register
│
├── Officer / Responder Portal            (role: officer)
├── Villager / Citizen Portal             (role: citizen)
├── Driver / Commuter Portal   **optional (role: driver)
├── Field Officer Portal                  (role: field_officer)
└── Admin Portal               **optional (role: admin)
```

### Route map (Next.js App Router)

| Route | Access | Portal |
|---|---|---|
| `/` | Public | Home |
| `/risk-map` | Public | Public preview map |
| `/alerts` | Public | Published alerts |
| `/report` | Public (rate-limited, captcha) | Report danger |
| `/about`, `/contact`, `/privacy`, `/terms` | Public | Static |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | Public | Auth |
| `/officer/dashboard`, `/officer/map`, `/officer/roads`, `/officer/alerts`, `/officer/routes`, `/officer/villages`, `/officer/reports` | `officer` | Officer |
| `/citizen/home`, `/citizen/my-area`, `/citizen/safe-place`, `/citizen/report`, `/citizen/profile` | `citizen` | Citizen |
| `/driver/route-check`, `/driver/alerts`, `/driver/map`, `/driver/report`, `/driver/profile` | `driver` | Driver |
| `/field/tasks`, `/field/map`, `/field/reports`, `/field/roads`, `/field/alerts`, `/field/profile` | `field_officer` | Field Officer |
| `/admin/users`, `/admin/roles`, `/admin/districts`, `/admin/areas`, `/admin/templates`, `/admin/data-sources`, `/admin/model-runs`, `/admin/logs` | `admin` | Admin |

---

## 6. Feature Requirements by Portal

> Priority tags: **[P1]** MVP, **[P2]** optional, **[P3]** excess feature, **[Idea]** proposed by this PRD where the plan asked for ideas.

### 6.1 Global layout (all pages)

| Element | Requirement |
|---|---|
| **Header** | Terra360 logo (left), misty-mountain-and-sun illustration band behind the bar, **notification bell with unread dot**, **user avatar menu** (right). Public header shows nav links + Login/Register instead of bell/avatar. |
| **Navbar (portal sidebar)** | Left sidebar with icon + label; active item highlighted in Misty Hills green; decorative pine-hills illustration and traditional-pattern border strip at bottom. Collapses to a bottom tab bar or drawer on mobile. |
| **Footer** | Dark Forest Canopy background with hills illustration and pattern strip. Links: **About · Privacy Policy · Terms of Use · Contact**. Social icons: LinkedIn, Instagram, GitHub. Text: "© 2026 Terra360. All rights reserved." Must contain **Contact us**. |

### 6.2 Public Website

#### Home (`/`) [P1]

Layout order from the plan: **Header → Hero section → three CTAs → Risk Map (prototype: major NH only) → Alerts → Report danger → Footer**.

| Section | Requirement |
|---|---|
| Hero | Headline + one-line value statement; background of layered hills; primary CTA **View Risk Map**. |
| CTA row | Three cards: **View Risk Map**, **Alerts**, **Report Danger**. |
| Risk Map preview | Embedded read-only map showing **major National Highways only** with colour-coded segment risk. "Open full map" button. |
| Alerts | Latest published alerts (title, level badge, area, time). |
| Report Danger | Short explainer + button to `/report`. |

**[Idea] Additions for the public site** (the plan notes *"ideas needed for public website"*):

1. **Live status strip**: "Last updated 12 min ago · Rainfall data: OK · SAR data: OK" builds trust and shows system health.
2. **Road status board**: list of major NH stretches with Open / Caution / Partially Blocked / Blocked (fed by field officer updates).
3. **How it works**: 3 steps (Satellite + rainfall → AI risk → Alert to you), with a one-line note on why SAR works in cloud.
4. **Monsoon safety guide**: what to do before, during and after a landslide; downloadable printable PDF in local languages.
5. **Emergency numbers**: state disaster control room, police, ambulance, always visible and tap-to-call.
6. **Language switcher** in the header (English, Assamese, Bengali, Hindi, plus other regional languages to be confirmed).
7. **Subscribe for alerts**: phone number + village opt-in (links to citizen registration).
8. **Impact counters**: villages monitored, km of NH covered, alerts issued this season.
9. **Partner / data-source logos** (satellite and weather data providers) for credibility.
10. **FAQ**: what each alert level means, how to report, privacy.

#### Risk Map, public preview (`/risk-map`) [P1]

- Read-only map, major NH corridors only, with legend: **Low / Medium / High / Critical**.
- No village-level personal data. No hospital/school layers.
- Click a segment → popup: road name, risk level, last updated, active alert link.
- Prompt to log in for detailed area guidance.

#### Alerts (`/alerts`) [P1]

- Public list of **approved** alerts only; filter by district, level, date.
- Alert card: level badge (**Watch / Warning / Critical**), area, message, issued time, expiry.
- Local-language toggle for message text.

#### Report (`/report`) [P1]

- One-tap categories: **crack, tilting tree, muddy water, fallen rocks, unusual sound, blocked road**.
- Optional photo and voice note; auto-capture GPS (manual pin fallback).
- Optional contact phone; anonymous allowed but flagged lower trust.
- Fallback instructions for **missed call / SMS** reporting.
- Protected by rate limiting + captcha. Reports start as `unverified` (see triage, [§7.3](#73-report-triage)).

#### About / Contact [P1]

- About: mission, how SAR + rainfall + AI work (non-technical), coverage area.
- Contact: form (name, email, message) → email via Nodemailer; also control-room numbers.

#### Login / Register [P1]

- **Email + password only.** See [§7.1](#71-authentication--sessions).
- Register collects: name, email, password, role selection limited to `citizen` or `driver`. **Officer / Field Officer / Admin accounts are created by invitation only** (see [§7.1](#71-authentication--sessions)).

---

### 6.3 Officer Portal (Disaster Management Officer) [P1]

**Navbar:** Dashboard · Live Risk Map · Road Impact · Alert Center · Safe Routes · Villages / Population · Field Reports

#### a) Dashboard [P1]

- **Summary cards:** Critical zones · High-risk roads · Active alerts · Villages at risk · Field reports pending.
- **Mini map** showing current hotspots.
- **Recent AI risk updates** feed.
- **Priority action list** (e.g. "Approve alert for Zone X", "Assign inspector to Report #123").
- **Rainfall & SAR data status** (last ingest time, OK / delayed / failed).

#### b) Live Risk Map [P1]

- Interactive map with risk zones: **Low / Medium / High / Critical**.
- **Layers (toggle):** rainfall, SAR change, slope, roads, villages, schools, hospitals, blocked roads.
- **Click a zone** → side panel with details: risk score and contributing factors, affected roads/villages, population estimate, recent reports, active alerts, "Create alert" shortcut.

#### c) Road Impact [P1]

- List/map of roads intersecting High/Critical zones with length at risk, status, nearest alternate.
- Actions: mark road blocked, request inspection, include in alert.

#### d) Alert Center [P1]

- **Create alert:** level **Watch / Warning / Critical**.
- **Select audience:** villagers, drivers, field teams, specific village, road corridor.
- **Choose channel:** app notification, SMS, IVRS voice call.
- **Preview message in local language** (template-driven; optional machine translation flagged for human review).
- **Approve and send** (two-step confirm for Critical).
- **Alert history with delivery status:** `sent`, `delivered`, `voice-call completed`, `failed`, with retry for failures.

#### e) Safe Routes [P1]

- Plan safe response routes avoiding blocked / high-risk segments for rescue teams.
- Show nearest shelters and travel time/distance. Dispatch team to route (creates a task for field officers).

#### f) Villages / Population [P1 stretch]

- **Village list** with risk level, population estimate, nearby safe location, nearest route, contact person.
- **Village detail:** risk history, active alerts, evacuation route, reported issues.

#### g) Field Reports [P1 stretch]

- Reports from villagers and field officers.
- **Filter by type:** crack, slope movement, water flow, fallen rocks, road blockage.
- **Status:** New · Under Review · Verified · False Alarm.
- **Actions:** assign field officer, create alert, mark road blocked.

---

### 6.4 Citizen / Villager Portal [P1]

**Navbar:** Home · My Area Risk · Safe Place · Report · (Profile)

Design rule: **icon-first, very short text, large tap targets, local language, works on low-end phones and weak networks.**

#### a) Home [P1]

- **Current risk status for the user's village:** Safe / Watch / Warning / Critical (large coloured icon + word + sound/vibration cue).
- Simple icon-based message.
- **Latest voice/SMS alert** (text with a "play voice message" button).
- **Emergency contact button** (one tap to call).

**[Idea] More for the Home tab** (plan: *"need more good ideas for home tab"*):

1. **"What should I do now?" card** with 2–3 plain steps matched to current level.
2. **Rainfall last 24 h / next 24 h** as a simple rain-drop gauge.
3. **Family check-in:** "I'm safe" button that notifies saved family numbers (uses profile data).
4. **Nearest safe place** mini-card with distance/time and offline badge.
5. **Neighbour reports nearby** (count of verified reports in last 24 h, no personal details).
6. **Road status for my village's access road.**
7. **Preparedness checklist** (go-bag, documents, medicines) with progress ticks, available offline.
8. **Offline-ready indicator** ("Your area is saved for offline use ✅").
9. **Seasonal tip of the day** (monsoon safety).
10. **Voice read-aloud** for every card (accessibility and low literacy).

#### b) My Area Risk [P1]

- Simplified map of user's village and nearby danger zones, colour-coded.
- Plain-language explanation, e.g. *"High risk near the stream road. Avoid this area during heavy rain."*
- Rainfall status.

#### c) Safe Place [P1]

- **Nearest designated safe location:** school, community hall, higher ground.
- Distance and simple directions (step list + map).
- **Offline cached route.**
- **Emergency contacts:** village head, district control room, police, ambulance.

#### d) Report [P1]

- One-tap categories: **crack, tilting tree, muddy water, fallen rocks, unusual sound, blocked road**.
- Optional photo (+ optional voice note [P3]). Auto-capture GPS.
- Submit via app; **fallback: missed call or SMS**.

#### e) Profile [P1]

- Name, phone number, village, language.
- Family members' phone numbers.
- Alert preferences: IVRS call, SMS, app notification.
- **Offline data download** (manage cached villages/routes).

---

### 6.5 Field Officer Portal [P1]

**Navbar:** My Tasks · Assigned Area Map · Reports · Road Status · Alerts · Profile

#### a) My Tasks [P1]

- Inspection tasks assigned by the Disaster Officer.
- **Task details:** location, risk level, reason, deadline.
- **Buttons:** Start Inspection · Mark Completed · Escalate.

#### b) Assigned Area Map [P1]

- Map of assigned villages and road stretches.
- High-risk zones and villager-submitted reports.
- **Navigation** to location (deep link to device maps app).

#### c) Reports [P1]

- Villager reports in the assigned area.
- **Verify, reject, or escalate** a report.
- Add field notes and photo.
- Create new report: **hill-cutting, visible cracks**, etc.

#### d) Road Status [P1]

- Update road condition: **Open / Caution / Partially Blocked / Blocked**.
- Add reason and photo.
- Status update is sent to the officer dashboard instantly.

#### e) Alerts [P1]

- Alerts relevant to assigned area.
- **Acknowledge receipt**; view instructions.

#### f) Profile [P1]

- Name, department, assigned area, phone number, language. *(Plan: "can add more if required.")*

---

### 6.6 Driver / Commuter Portal [P2, optional]

**Navbar:** Route Check · My Route Alerts · Risk Map · Report Issue · Profile

- **Route Check:** enter start/end (or pick a saved route) → route risk summary per segment, **road-risk warnings**, **alternate route** if available.
- **My Route Alerts:** alerts affecting saved routes, with opt-in SMS.
- **Risk Map:** NH-focused map with road status.
- **Report Issue:** blocked road, fallen rocks, crack.
- **Profile:** name, phone, vehicle type (optional), saved routes, alert preferences.

---

### 6.7 Admin Portal [P2, optional]

**Navbar:** Users · Roles & Permissions · Districts · Areas · Alert Templates · Data Sources · Model Runs · System Logs

| Module | Requirement |
|---|---|
| Users | List/search, invite officer & field officer, deactivate, force logout, unlock |
| Roles & Permissions | View role matrix; limited editing of permissions |
| Districts / Areas | CRUD for districts, areas, village-to-area assignments |
| Alert Templates | Per level, per language, per channel; variables like `{village}`, `{level}`, `{time}`; DLT template ID field for SMS |
| Data Sources | Configure rainfall/SAR/slope feeds; last sync; enable/disable |
| Model Runs | List runs (time, version, status, zones produced); approve / roll back a run |
| System Logs | Audit log (who approved which alert, who changed roles) and delivery logs, with redaction |

---

## 7. Cross-Cutting Features

### 7.1 Authentication & Sessions

**Auth method: email + password only** (no Google OAuth; the Passport/Google parts of the blueprint are removed).

| Item | Rule |
|---|---|
| Registration | `citizen` and `driver` self-register with email + password. Email verification link required before alert preferences can be edited. |
| Staff accounts | `officer`, `field_officer`, `admin` are created via **invite token** (`crypto.randomBytes(32)`, hashed in DB, TTL). Invitee sets password. |
| Login | Email + password. Generic error messages ("Invalid email or password") to prevent enumeration. |
| Password reset | Emailed single-use token, short TTL, hashed in DB; generic "if the email exists" response. |
| Access token | JWT, **15 min**, returned in JSON, sent as `Authorization: Bearer`. Stored **in memory only** on the client. |
| Refresh token | **7 days**, `HttpOnly; Secure; SameSite=Strict` cookie, **hashed** in DB, **rotated** on every refresh; reuse triggers full revocation. |
| Lockout | 5 failed attempts → 15-minute lock (TTL-indexed login-attempt collection). |
| Sessions | Users can list and revoke active sessions. |
| Passwords | `bcryptjs`, cost ≥ 10; minimum length 8 (staff: 12). |

> **Open issue, citizens without email:** many villagers may not have an email address but do have a phone. With "auth = email" this blocks them. Recommended options: (a) **assisted registration** by a field officer using the officer's email-verified flow, creating a citizen record with a placeholder email; (b) allow phone-based **alert-only enrolment** (no login) via SMS/IVRS opt-in; (c) add phone OTP login later. See [§23](#23-risks--open-questions).

> **Cookie / hosting note:** `SameSite=Strict` cookies only flow between pages and APIs on the **same site**. If the frontend is on `terra360.example` and the API on a different registrable domain, refresh will fail. Use either **sibling subdomains of one domain** (`app.` and `api.`) or a **Next.js rewrite/proxy** so `/api/*` is same-origin.

### 7.2 Alert Lifecycle

```
AI model run → risk zone updated
      │
      ▼
 System drafts alert suggestion (status: draft)
      │
      ▼
 Officer reviews → edits audience/channel/message → Approve   (status: approved)
      │
      ▼
 Dispatcher fans out per channel (app push / SMS / IVRS)
      │
      ▼
 Delivery records per recipient: queued → sent → delivered | voice_completed | failed
      │
      ▼
 Retry failures (bounded) → alert expires or is cancelled/downgraded
```

- **Levels:** Watch, Warning, Critical. **Zone risk levels:** Low, Medium, High, Critical.
- **Idempotency:** each alert has a unique `alertId`; the dispatcher must not double-send on retry.
- **Audit:** every create/approve/cancel is logged with user and time.
- **Quiet hours:** Watch alerts may respect quiet hours; Warning/Critical never do.

### 7.3 Report Triage

From the plan's "AI report triage" feature:

| Priority | Condition (examples) | Routing |
|---|---|---|
| **High** | Active slope movement, road blockage on NH, multiple matching reports, location inside High/Critical zone | Sent to a **designated Disaster Officer** (dashboard priority + notification) |
| **Medium** | Plausible report in elevated-risk area, single reporter with good trust | **Verified by nearby volunteers or field officers** |
| **Low / Unverified** | No location, anonymous, outside risk zones, conflicts with other data | **Held back** (not shown publicly, no alerts) to avoid false alarms |

Scoring inputs: report type, GPS accuracy, zone risk at location, number of similar reports within radius/time, reporter trust score, photo presence, current rainfall. Start with a **transparent rule-based score**; a model can replace it later. Officers can always override.

Report statuses: **New → Under Review → Verified / False Alarm**. Trust score of a reporter goes up on Verified, down on False Alarm.

### 7.4 Offline & Low-Connectivity Support

- **PWA** (installable) with a service worker caching the shell, the user's village risk, safe-place routes and emergency contacts.
- **IndexedDB** for offline data (no tokens inside it).
- **Offline report queue:** reports created offline sync later; SMS / missed-call fallback documented in the UI.
- **IVRS voice call** for non-smartphone users; **SMS** with short, plain text.
- Show "last synced" time everywhere cached data is used.

### 7.5 Localisation

- UI and alert templates in **English + regional languages** (final list to confirm: Assamese, Bengali, Hindi, others).
- Use i18n routing/messages in Next.js; store `language` on the user.
- Voice-call scripts are templates per language, human-reviewed.

### 7.6 Notifications

- In-app notification bell (header) with unread dot; list and mark-as-read.
- Web push (optional, P2) in addition to SMS/IVRS.
- Email for account events and contact form only.

### 7.7 Shelter & Evacuation Intelligence [P3 / partly P1]

- Show **nearest safe shelter, travel time and distance** (Citizen Safe Place, Officer Safe Routes).
- Shelter record: name, type (school / hall / high ground), capacity, coordinates, contact, accessibility, **safe-from-landslide check** against current risk zones.
- Route must avoid blocked/high-risk segments.

### 7.8 Citizen Early-Warning Network [P3]

- Villagers report early signs by **photo, voice note, or message**.
- Network of trusted volunteers per village for Medium-priority verification.
- Feedback loop: reporter is told when the report is verified ("Thank you, your report helped.").

---

## 8. Design System & Brand

### 8.1 Brand

- **Name:** Terra360 (wordmark: "TERRA" in forest green with a mountain-and-signal-waves mark replacing the "A", "360" in ochre).
- **Tone:** calm, trustworthy, grounded in landscape; not alarmist until alerts are Critical.

### 8.2 Colour palette (from the plan)

| Token | Name | Hex | Use |
|---|---|---|---|
| `forest` | Forest Canopy | `#173D32` | Primary: headings, header text, footer background, primary buttons |
| `ochre` | Earth & Ochre | `#D6A65D` | Accent: CTAs, "360" in logo, highlights, links on dark |
| `mist` | Misty Hills | `#DCE8D4` | Secondary surfaces: active nav item, cards, tags |
| `cloud` | Cloud White | `#F6F4EC` | Page background |

**Proposed semantic risk colours** (not in the plan; needed for maps and badges, tune for contrast):

| Level | Suggested colour | Also use |
|---|---|---|
| Low | Soft green | Icon + "Low" label |
| Medium | Amber/yellow | Icon + "Medium" label |
| High | Orange | Icon + "High" label |
| Critical | Deep red | Icon + "Critical" label, pulse animation (respect reduced-motion) |

> **Accessibility rule:** never rely on colour alone. Every risk state has an **icon, a label and a pattern/shape** for colour-blind users. Check text contrast (WCAG AA) for ochre-on-cloud, since `#D6A65D` on `#F6F4EC` is low contrast for small text; use forest text or darken ochre for text use.

### 8.3 Tailwind tokens

```ts
// tailwind.config.ts (excerpt — theme.extend.colors)
colors: {
  forest: '#173D32',
  ochre:  '#D6A65D',
  mist:   '#DCE8D4',
  cloud:  '#F6F4EC',
}
```

### 8.4 Visual language

- **Logo:** wordmark described above; provide SVG light and dark (white-text) versions for the footer.
- **Header:** logo left; pale misty-mountain/sun illustration across the bar; bell with ochre dot; circular avatar in mist green; 1 px forest bottom border.
- **Sidebar:** icons (Dashboard, Map, Analytics, Reports, Alerts, Settings pattern) with active pill in `mist`; pine-hills illustration and a traditional woven pattern strip at the bottom.
- **Footer:** forest background with hills silhouette top edge (ochre line), logo, links, social icons, woven pattern strip.
- **Components:** rounded corners (≈ 12–16 px), soft shadows, generous spacing; large tap targets (≥ 44 px) for citizen UI.
- **Typography:** one clean humanist sans for UI; large size and high contrast in the citizen portal. Pick fonts that support the regional scripts you localise to.
- **Motion:** subtle; disable on `prefers-reduced-motion`.

---

## 9. Tech Stack

| Layer | Choice | Version | Notes |
|---|---|---|---|
| **Runtime** | Node.js | **Web search** current **Active LTS** | Use [nodejs.org](https://nodejs.org/) |
| **Backend framework** | Express | **Search + `npm show`** | Verify Express/Node compatibility |
| **Language** | TypeScript | **Search + `npm show`** | Strict mode, both apps |
| **Database** | MongoDB (Atlas) | n/a | Geospatial (`2dsphere`) indexes for zones, villages, roads, shelters |
| **ODM** | Mongoose | **Search + `npm show`** | Match Atlas/driver docs |
| **Validation** | Zod | **Search + `npm show`** | Env + request bodies + shared schemas |
| **Auth** | Email + password | n/a | Own implementation (no Passport/OAuth) |
| **JWT** | jsonwebtoken | **Search + `npm show` + advisory** | Access + refresh |
| **Password hashing** | bcryptjs | **Search + `npm show`** | |
| **Security headers** | helmet | **Search + `npm show` + advisory** | |
| **CORS** | cors | **Search + `npm show`** | Explicit origin list |
| **Rate limiting** | express-rate-limit | **Search + `npm show`** | Per-route |
| **NoSQL sanitise** | express-mongo-sanitize | **Search + `npm show`** | |
| **Cookies** | cookie-parser | **Search + `npm show`** | Refresh cookie |
| **Job scheduling** | node-cron | **Search + `npm show`** | Ingest polling, dispatcher retries, expiry |
| **Email** | nodemailer | **Search + `npm show`** | Verification, reset, contact form |
| **SMS / IVRS** | Provider TBD (e.g. an Indian telecom API provider) | **Search + docs** | India requires **DLT registration** for SMS templates; confirm provider and compliance |
| **Real-time** | Server-Sent Events or socket.io | **Search + `npm show`** | Live dashboard updates; SSE is simpler if one-way |
| **Logging** | winston | **Search + `npm show`** | Redact PII/secrets |
| **Monitoring** | @sentry/node, @sentry/nextjs | **Search + Sentry docs** | Scrub sensitive data |
| **Frontend framework** | React + **Next.js** | **Search + `npm show`** each | App Router; mostly client-rendered for authed portals |
| **Styling** | **Tailwind CSS** | **Search + `npm show`** | Brand tokens in §8.3 |
| **Server state** | TanStack Query | **Search + `npm show`** | Caching, retries, offline persistence |
| **HTTP client** | Axios | **Search + `npm show`** | Refresh interceptor |
| **Forms** | React Hook Form + Zod | **Search + `npm show`** each | |
| **HTML sanitise** | DOMPurify | **Search + `npm show` + advisory** | |
| **Maps** | MapLibre GL JS or Leaflet | **Search + `npm show`** | Vector/GeoJSON layers; offline tiles for citizen map if feasible |
| **Charts** | Recharts or Chart.js | **Search + `npm show`** | Dashboard trends |
| **PWA** | Service worker (next-pwa alternative or manual) | **Search + docs** | Verify compatibility with current Next.js |
| **i18n** | next-intl or similar | **Search + `npm show`** | |
| **Deploy: Frontend** | Vercel | n/a | Env vars in dashboard |
| **Deploy: Backend** | Render / Railway | n/a | Env vars in dashboard; health checks |
| **Deploy: DB** | MongoDB Atlas | n/a | IP allowlist required |

**Token lifetime standard:** Access JWT `15 minutes` (Authorization header) · Refresh token `7 days` (HttpOnly Secure SameSite=Strict cookie).

---

## 10. Repository Structure

```
terra360/
├── backend/
│   ├── src/
│   │   ├── server.ts                    # Entry: DB connect → cron start → listen
│   │   ├── app.ts                       # Express app: middleware stack + route mounts
│   │   ├── config/
│   │   │   ├── env.ts                   # Zod-validated env — crash on bad config
│   │   │   └── db.ts                    # mongoose.connect / disconnect
│   │   ├── middleware/
│   │   │   ├── requireAuth.ts           # JWT verify → req.user
│   │   │   ├── roleGuard.ts             # Role + area enforcement
│   │   │   ├── validate.ts              # Zod schema factory → 400
│   │   │   ├── uploadGuard.ts           # File type/size checks
│   │   │   └── errorHandler.ts          # Central error → standard JSON
│   │   ├── modules/
│   │   │   ├── auth/                    # routes, controller, service, schema
│   │   │   ├── users/                   # + user.model.ts
│   │   │   ├── invites/
│   │   │   ├── districts/  areas/
│   │   │   ├── villages/
│   │   │   ├── roads/                   # road segments + status
│   │   │   ├── riskZones/               # zones, layers, risk history
│   │   │   ├── alerts/                  # alerts, templates, deliveries
│   │   │   ├── reports/                 # reports + triage
│   │   │   ├── tasks/                   # inspection tasks
│   │   │   ├── shelters/
│   │   │   ├── routes/                  # safe route / route check
│   │   │   ├── notifications/
│   │   │   ├── dataSources/  modelRuns/ # admin
│   │   │   └── auditLogs/
│   │   ├── services/
│   │   │   ├── email.service.ts         # Nodemailer wrapper
│   │   │   ├── sms.service.ts           # SMS provider adapter
│   │   │   ├── ivrs.service.ts          # Voice call provider adapter
│   │   │   ├── dispatcher.service.ts    # Alert fan-out + retries
│   │   │   ├── triage.service.ts        # Report priority scoring
│   │   │   ├── ingest.service.ts        # Rainfall/SAR/model output ingestion
│   │   │   └── cron.service.ts          # node-cron jobs
│   │   ├── utils/
│   │   │   ├── jwt.ts
│   │   │   ├── ownershipCheck.ts
│   │   │   ├── tokenCompare.ts          # crypto.timingSafeEqual wrapper
│   │   │   └── geo.ts                   # point-in-polygon, distance helpers
│   │   └── types/express.d.ts           # Augment Request with req.user
│   ├── postman/
│   │   ├── collection.json
│   │   └── environment.json            # No real secrets
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json                    # Strict mode
│
├── frontend/                            # Next.js (App Router)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (public)/                # /, /risk-map, /alerts, /report, /about, /contact
│   │   │   ├── (auth)/                  # /login, /register, /forgot-password …
│   │   │   ├── officer/  citizen/  field/  driver/  admin/
│   │   │   ├── layout.tsx  not-found.tsx  error.tsx
│   │   ├── components/
│   │   │   ├── layout/                  # Header, Sidebar, Footer
│   │   │   ├── map/                     # MapView, LayerToggle, RiskLegend
│   │   │   ├── ui/                      # Button, Badge, Card, Modal …
│   │   │   ├── RequireAuth.tsx          # Client route guard (role-aware)
│   │   │   └── ErrorBoundary.tsx
│   │   ├── features/<resource>/         # api.ts (TanStack hooks), components/, types.ts
│   │   ├── lib/
│   │   │   ├── env.ts                   # NEXT_PUBLIC_* Zod validation
│   │   │   └── api/{client.ts, refreshClient.ts}
│   │   ├── auth/{AuthProvider.tsx, tokenStore.ts}
│   │   ├── offline/                     # service worker helpers, IndexedDB, sync queue
│   │   └── i18n/                        # messages per language
│   ├── public/                          # logo svgs, illustrations, manifest, sw
│   ├── tailwind.config.ts
│   ├── .env.example
│   └── package.json
│
├── shared/                              # (optional) shared Zod schemas/types
├── docs/
│   ├── Terra360_PRD.md                  # This file
│   └── BACKEND_PLANNING.md
├── .gitignore
├── .cursorignore
└── README.md
```

**Rules, never break these:**

- Never commit `.env`, `node_modules`, `.next/`, `dist/`, `build/`.
- Always commit `.env.example` with placeholder values.
- One source of truth for env validation: `backend/src/config/env.ts` and `frontend/src/lib/env.ts`.
- TypeScript strict mode always on; no `any` unless typed and commented.

### `.gitignore`

```gitignore
# Dependencies
node_modules/

# Env & secrets — only .env.example may be committed
.env
.env.*
!.env.example

# Keys
*.pem
*.key
id_rsa
id_ed25519
*.p12
*.pfx

# Build output
dist/
build/
out/
.next/
*.tsbuildinfo

# Logs & coverage
*.log
npm-debug.log*
coverage/
.nyc_output/

# OS noise
.DS_Store
Thumbs.db
```

Verify before first push: `git status` must not list `.env` or `node_modules`; use `git check-ignore -v <path>` if unsure.

---

## 11. Environment Variables

### Backend `.env.example`

```env
# ── Server ───────────────────────────────────────────────
NODE_ENV=development
PORT=5000

# ── Database ─────────────────────────────────────────────
MONGODB_URI=mongodb://localhost:27017/terra360
# Production: mongodb+srv://<user>:<pass>@cluster.mongodb.net/terra360

# ── JWT ──────────────────────────────────────────────────
# Generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=replace_with_64_char_hex
JWT_REFRESH_SECRET=replace_with_different_64_char_hex
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ── URLs & CORS ──────────────────────────────────────────
CLIENT_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000
COOKIE_DOMAIN=localhost

# ── Encryption (sensitive fields, e.g. family phone numbers) ──
# Generate: openssl rand -hex 32
ENCRYPTION_KEY=replace_with_64_char_hex

# ── Email (Nodemailer) ───────────────────────────────────
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_api_key
EMAIL_FROM=noreply@terra360.example

# ── SMS / IVRS provider ──────────────────────────────────
SMS_PROVIDER=your_provider
SMS_API_KEY=your_sms_api_key
SMS_SENDER_ID=TERRA3
SMS_DLT_ENTITY_ID=your_dlt_entity_id
IVRS_API_KEY=your_ivrs_api_key
IVRS_CALLER_ID=your_caller_id

# ── Data ingestion (rainfall / SAR / model outputs) ──────
RAINFALL_API_URL=https://example.com/rainfall
RAINFALL_API_KEY=your_key
MODEL_INGEST_TOKEN=replace_with_long_random_token   # for the model service → API calls
INGEST_CRON=*/15 * * * *

# ── Uploads (photos / voice notes) ───────────────────────
STORAGE_BUCKET=your_bucket
STORAGE_ACCESS_KEY=your_key
STORAGE_SECRET_KEY=your_secret
MAX_UPLOAD_MB=5

# ── Captcha (public report form) ─────────────────────────
CAPTCHA_SECRET=your_captcha_secret

# ── Monitoring ───────────────────────────────────────────
SENTRY_DSN=https://your_sentry_dsn_here
```

### Frontend `.env.example`

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_MAP_STYLE_URL=https://example.com/style.json
NEXT_PUBLIC_CAPTCHA_SITE_KEY=your_captcha_site_key
NEXT_PUBLIC_DEFAULT_LANGUAGE=en
NEXT_PUBLIC_SENTRY_DSN=https://your_sentry_dsn_here
```

> Anything prefixed `NEXT_PUBLIC_` is visible to every visitor. Never put secrets there.

### Env validation pattern (backend)

```typescript
// src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: z.string().url(),
  CORS_ORIGINS: z.string(),
  ENCRYPTION_KEY: z.string().length(64),
  SMTP_HOST: z.string(),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  EMAIL_FROM: z.string().email(),
  MODEL_INGEST_TOKEN: z.string().min(32),
  SENTRY_DSN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1); // never run with bad config
}
export const env = parsed.data;
```

> Note: MongoDB URIs (`mongodb://`, `mongodb+srv://`) can fail strict `z.string().url()` checks, so a non-empty string plus a prefix check is safer.

---

## 12. Data Model

> Mongoose schemas (summary). All documents have `createdAt`, `updatedAt`. Soft-delete (`isDeleted`, `deletedAt`) on user-facing records. Geo fields are GeoJSON with `2dsphere` indexes.

| Collection | Key fields | Indexes / notes |
|---|---|---|
| **User** | `email` (unique, lowercased), `passwordHash`, `role`, `name`, `phone`, `language`, `villageId?`, `areaIds[]`, `department?`, `familyContacts[]` (encrypted), `alertPrefs {ivrs, sms, push}`, `emailVerified`, `isActive`, `failedLogins`, `lockedUntil`, `refreshTokens[] {hash, createdAt, userAgent, ip}` | unique `email`; index `role`, `villageId` |
| **Invite** | `email`, `role`, `tokenHash`, `invitedBy`, `expiresAt`, `usedAt` | TTL on `expiresAt` |
| **LoginAttempt** | `email`, `ip`, `at` | TTL (e.g. 15 min–24 h) |
| **District** | `name`, `state`, `controlRoomPhone`, `boundary` (GeoJSON) | `2dsphere` |
| **Area** | `name`, `districtId`, `boundary` | `2dsphere` |
| **Village** | `name`, `districtId`, `areaId`, `location` (Point), `populationEstimate`, `contactPerson {name, phone}`, `safeShelterIds[]`, `currentRiskLevel` | `2dsphere`, index `areaId` |
| **RoadSegment** | `name`, `highwayRef` (e.g. NH), `geometry` (LineString), `isMajorNH`, `status` (open/caution/partial/blocked), `statusReason`, `statusUpdatedBy`, `statusUpdatedAt`, `currentRiskLevel` | `2dsphere`, index `isMajorNH` |
| **RiskZone** | `modelRunId`, `geometry` (Polygon), `riskLevel` (low/medium/high/critical), `score`, `factors {rainfall, sarChange, slope, …}`, `validFrom`, `validTo`, `affectedRoadIds[]`, `affectedVillageIds[]` | `2dsphere`, index `modelRunId`, `riskLevel` |
| **RiskHistory** | `entityType` (village/road), `entityId`, `riskLevel`, `at` | TTL or capped by policy |
| **Alert** | `level` (watch/warning/critical), `status` (draft/approved/sent/cancelled/expired), `audience {roles[], villageIds[], roadIds[], areaIds[]}`, `channels[]`, `messages {lang: text}`, `createdBy`, `approvedBy`, `approvedAt`, `expiresAt`, `sourceZoneIds[]`, `idempotencyKey` | index `status`, `level`, `createdAt` |
| **AlertDelivery** | `alertId`, `userId?`, `phone?`, `channel`, `status` (queued/sent/delivered/voice_completed/failed), `providerRef`, `attempts`, `error?`, `updatedAt` | index `alertId`, `status` |
| **AlertTemplate** | `level`, `language`, `channel`, `body`, `variables[]`, `dltTemplateId?`, `isActive` | unique `(level, language, channel)` |
| **Report** | `reporterId?`, `source` (app/public/sms/missed_call/field), `type`, `description`, `location` (Point), `gpsAccuracy`, `photos[]`, `voiceNote?`, `priority` (high/medium/low/unverified), `triageScore`, `status` (new/under_review/verified/false_alarm), `verifiedBy`, `assignedTo`, `notes[]`, `clientId` (idempotency for offline sync) | `2dsphere`, index `status`, `priority`, `createdAt` |
| **Task** | `reportId?`, `zoneId?`, `location`, `riskLevel`, `reason`, `assignedTo`, `assignedBy`, `deadline`, `status` (assigned/in_progress/completed/escalated), `notes`, `completedAt` | index `assignedTo`, `status` |
| **Shelter** | `name`, `type`, `location`, `capacity`, `contact`, `villageIds[]`, `isActive`, `accessNotes` | `2dsphere` |
| **Notification** | `userId`, `type`, `title`, `body`, `link`, `readAt` | index `userId`, `readAt` |
| **DataSource** | `type` (rainfall/sar/slope/model), `name`, `config` (non-secret), `lastSyncAt`, `status`, `isEnabled` | |
| **ModelRun** | `version`, `startedAt`, `finishedAt`, `status`, `zonesCreated`, `notes`, `approvedBy?` | index `startedAt` |
| **RainfallObservation** | `stationId`, `location`, `mm`, `window`, `at` | `2dsphere`, TTL by policy |
| **AuditLog** | `actorId`, `action`, `entityType`, `entityId`, `meta`, `ip`, `at` | index `actorId`, `at` |

---

## 13. Backend Architecture

### 13.1 Middleware stack order (`app.ts`)

```typescript
// 1. Sentry request handler (first)
// 2. Health + readiness routes (before rate limiters)
// 3. helmet()
// 4. cors({ origin: env.CORS_ORIGINS.split(','), credentials: true, methods: [...] })
// 5. cookie-parser
// 6. express.json({ limit: '10kb' })   // bigger limits only on upload routes
// 7. express-mongo-sanitize
// 8. morgan (dev only)
// 9. Global limiter on /api (e.g. 100/min)
// 10. Strict limiter on /api/v1/auth (e.g. 10/min, skipSuccessfulRequests)
// 11. Public-report limiter on POST /api/v1/reports/public (stricter + captcha)
// 12. Routes under /api/v1
// 13. Sentry error handler
// 14. Central errorHandler (always last)
```

Check current Sentry SDK docs for the right Express integration; handler APIs change between major versions.

### 13.2 Health & readiness

- `GET /health`: liveness, `200` if the process is up (no DB call).
- `GET /ready`: `200` only if Mongo is connected (`readyState === 1`), else `503`.
- Exclude both from strict rate limits.

### 13.3 Standard response shapes

```jsonc
// Success
{ "success": true, "data": { } }

// Paginated
{ "success": true, "data": [], "pagination": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 } }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human readable", "fields": { "email": ["Invalid email"] } } }
```

### 13.4 Authorization model

Two layers, **both** required:

1. **Role guard**: `roleGuard('officer')` etc. at route level.
2. **Scope check** inside the service:
   - Field officers only see **assigned areas** (`areaIds`).
   - Citizens only see **their own** profile, village and reports.
   - Report/task access filtered by assignment or ownership.

`assertOwnership()` (from the blueprint) applies to user-owned resources (profile, own reports, sessions). For area-scoped resources (field officer), add `assertInScope(user, resource)`. Return **404** for out-of-scope resources.

### 13.5 Data ingestion & model runs

Terra360 does **not** train or run the SAR/AI model inside Express. Assumed flow:

```
Rainfall API ─┐
SAR change   ─┼─► Model service (separate, e.g. Python) ─► POST /api/v1/internal/model-runs
Slope / DEM  ─┘                                             (auth: MODEL_INGEST_TOKEN, IP allowlist)
                                                                   │
                                                                   ▼
                                       Express validates (Zod) → stores ModelRun + RiskZones
                                       → recomputes affected roads/villages → drafts alert suggestions
```

- Internal endpoint is **not** reachable with user JWTs; uses a separate machine token compared with `timingSafeEqual`.
- Ingestion jobs record status in `DataSource` so the dashboard can show "Rainfall & SAR data status".
- If data is stale (older than threshold), the dashboard shows a visible warning and no new automatic drafts are created.

### 13.6 Alert dispatcher

- Resolves audience → list of recipients (users + enrolled phone numbers).
- Fan-out per channel with provider adapters (`sms.service`, `ivrs.service`, in-app notification).
- Idempotent by `(alertId, recipient, channel)`.
- Webhook endpoints for provider delivery receipts update `AlertDelivery` (verify provider signatures).
- Retry with backoff for `failed`; cap attempts; surface persistent failures on the Alert Center.

### 13.7 Cron jobs

| Job | Frequency | Purpose |
|---|---|---|
| Ingest poller | Every 15 min (configurable) | Pull rainfall/other feeds |
| Dispatcher retry | Every 1–2 min | Retry failed deliveries |
| Alert expiry | Every 5 min | Expire alerts past `expiresAt` |
| Report triage re-score | Every 10 min | Re-evaluate with new data / clustering |
| Stale-data watchdog | Every 15 min | Flag stale data sources |
| Cleanup | Daily | Housekeeping (TTL handles most) |

If you scale to more than one backend instance, cron must run on **one** instance only (or use a job queue/lock) to avoid duplicate sends.

### 13.8 Real-time updates

- Officer Dashboard, Alert Center and Field Reports need live updates (new report, delivery status change, new risk update).
- Use **SSE** (simple, one-way) or socket.io with JWT handshake validation before joining rooms (`role:officer`, `area:<id>`).

### 13.9 File uploads (photos / voice notes)

- Validate **type (magic bytes), size and count** server-side; strip EXIF location from public display copies (keep GPS in the DB, not in the file).
- Store in object storage via signed upload URLs; never serve user uploads from the API origin with executable types.
- Virus/abuse scanning is optional; at minimum limit mime types (`image/jpeg`, `image/png`, `image/webp`, `audio/*` as decided).

### 13.10 Ownership helper and timing-safe compare

Reuse the blueprint helpers:

```typescript
// src/utils/ownershipCheck.ts — always 404, never 403, for wrong user
// src/utils/tokenCompare.ts
import crypto from 'crypto';
export function safeCompare(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
```

---

## 14. API Documentation Standard & Endpoint Catalog

### 14.1 Template (copy for each endpoint)

```
### METHOD /api/v1/<resource>/<action>

**Description:** One sentence.
**Auth required:** Yes / No
**Minimum role:** public / citizen / driver / field_officer / officer / admin

#### Request
Headers: Authorization: Bearer <accessToken>, Content-Type: application/json
Path params / Query params / Body (with required/optional notes)

#### Responses
200/201 success · 400 VALIDATION_ERROR · 401 · 403 · 404 · 409 · 429

#### Postman example
Method, URL {{baseUrl}}/api/v1/..., body, tests

#### Use cases
#### Business rules
```

### 14.2 Worked example: Create alert

```
### POST /api/v1/alerts

**Description:** Creates a draft alert for review by an officer.
**Auth required:** Yes
**Minimum role:** officer

Body:
{
  "level": "warning",                       // Required. watch | warning | critical
  "audience": {                             // Required. At least one target.
    "roles": ["citizen", "driver"],
    "villageIds": ["64a1b2c3d4e5f6a7b8c9d0e1"],
    "roadIds": []
  },
  "channels": ["sms", "ivrs", "push"],      // Required. At least one.
  "messages": { "en": "…", "as": "…" },     // Required. At least the default language.
  "expiresAt": "2026-11-07T12:00:00.000Z",  // Required. Must be in the future.
  "sourceZoneIds": []                       // Optional.
}

201: { "success": true, "data": { "_id": "...", "status": "draft", ... } }
400: VALIDATION_ERROR | INVALID_REQUEST (e.g. expiresAt in the past, empty audience)
401: UNAUTHORIZED / TOKEN_EXPIRED
403: FORBIDDEN (not an officer)

Business rules:
- Draft is not delivered until POST /alerts/:id/approve.
- Critical alerts require an explicit confirmation flag on approve.
- Creator and approver may be the same officer (change if your SOP requires two people).
```

### 14.3 Worked example: Approve & send alert

```
### POST /api/v1/alerts/:id/approve

**Description:** Approves a draft alert and queues delivery.
**Auth required:** Yes · **Minimum role:** officer

Body: { "confirm": true }       // Required for level = critical

200: { "success": true, "data": { "_id": "...", "status": "approved", "queuedRecipients": 1240 } }
404: NOT_FOUND
409: CONFLICT (already approved / cancelled / expired)

Business rules:
- Writes AuditLog.
- Dispatcher is idempotent; calling twice never double-sends.
```

### 14.4 Endpoint catalog (all prefixed `/api/v1`)

**Auth & account**

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/auth/register` | public | Citizen/driver self-registration |
| POST | `/auth/login` | public | Email + password; returns access token + sets refresh cookie |
| POST | `/auth/refresh` | cookie | Rotate refresh token, return new access token |
| POST | `/auth/logout` | any | Clear cookie + DB entry |
| POST | `/auth/verify-email` | public | Verify email token |
| POST | `/auth/forgot-password` | public | Send reset email (generic response) |
| POST | `/auth/reset-password` | public | Reset with token |
| POST | `/auth/accept-invite` | public | Staff sets password from invite |
| GET | `/users/me` | any | Current profile |
| PATCH | `/users/me` | any | Update profile, language, alert prefs |
| PATCH | `/users/me/password` | any | Change password |
| GET | `/users/me/sessions` | any | List sessions |
| DELETE | `/users/me/sessions/:id` | any | Revoke a session |
| GET | `/users/me/export` | any | Export own data |
| DELETE | `/users/me` | any | Delete account (requires confirmation text) |

**Public**

| Method | Path | Purpose |
|---|---|---|
| GET | `/public/risk-map` | Major-NH risk GeoJSON (no personal data) |
| GET | `/public/alerts` | Approved alerts (filter/paginate) |
| GET | `/public/road-status` | Major-NH status list |
| GET | `/public/stats` | Counters for home page |
| POST | `/reports/public` | Submit danger report (captcha, strict rate limit) |
| POST | `/contact` | Contact form → email |

**Officer**

| Method | Path | Purpose |
|---|---|---|
| GET | `/officer/dashboard` | Summary cards, priority actions, data status |
| GET | `/risk-zones` | Zones (bbox/layer filters) |
| GET | `/risk-zones/:id` | Zone detail |
| GET | `/layers/:name` | Rainfall / SAR / slope / schools / hospitals GeoJSON |
| GET | `/roads/impact` | Roads intersecting High/Critical zones |
| PATCH | `/roads/:id/status` | Mark open/caution/partial/blocked |
| GET | `/alerts` | List/filter alerts |
| POST | `/alerts` | Create draft |
| POST | `/alerts/:id/preview` | Render message per language/channel |
| POST | `/alerts/:id/approve` | Approve & send |
| POST | `/alerts/:id/cancel` | Cancel |
| GET | `/alerts/:id/deliveries` | Delivery status |
| POST | `/alerts/:id/retry-failed` | Retry failed deliveries |
| POST | `/routes/safe` | Compute safe response route |
| GET | `/villages` · `/villages/:id` | List / detail with history |
| GET | `/reports` · `/reports/:id` | List/filter reports |
| PATCH | `/reports/:id/status` | Set under_review / verified / false_alarm |
| POST | `/tasks` | Assign inspection task |

**Citizen**

| Method | Path | Purpose |
|---|---|---|
| GET | `/me/area` | Village risk, rainfall, latest alert, emergency contacts |
| GET | `/me/area/map` | Simplified zones around village |
| GET | `/me/safe-place` | Nearest shelter(s) + route |
| GET | `/me/offline-bundle` | Cacheable bundle for offline use |
| POST | `/reports` | Submit report (auth'd) |
| GET | `/reports/mine` | Own reports + status |
| POST | `/me/checkin` | "I'm safe" to family contacts |
| GET/PATCH | `/notifications` | List / mark read |

**Field officer**

| Method | Path | Purpose |
|---|---|---|
| GET | `/field/tasks` | Assigned tasks |
| PATCH | `/field/tasks/:id` | Start / complete / escalate (+ notes) |
| GET | `/field/area` | Assigned area map data |
| GET | `/field/reports` | Reports in area |
| PATCH | `/field/reports/:id` | Verify / reject / escalate + notes + photo |
| POST | `/field/reports` | Create field report |
| PATCH | `/field/roads/:id/status` | Update road status (reason + photo) |
| GET | `/field/alerts` · POST `/field/alerts/:id/ack` | View / acknowledge |

**Driver (optional)**

| Method | Path | Purpose |
|---|---|---|
| POST | `/driver/route-check` | Risk per segment + alternate |
| GET/POST/DELETE | `/driver/routes` | Saved routes |
| GET | `/driver/alerts` | Alerts affecting saved routes |

**Admin (optional)**

| Method | Path | Purpose |
|---|---|---|
| GET/POST/PATCH | `/admin/users`, `/admin/invites` | Manage users, invite staff |
| PATCH | `/admin/users/:id/lock` | Lock/unlock |
| CRUD | `/admin/districts`, `/admin/areas`, `/admin/villages`, `/admin/shelters` | Reference data |
| CRUD | `/admin/alert-templates` | Templates |
| GET/PATCH | `/admin/data-sources` | Feeds |
| GET | `/admin/model-runs` | Runs |
| GET | `/admin/logs` | Audit/system logs |

**Internal / system**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/internal/model-runs` | Machine token | Submit new zones from model service |
| POST | `/webhooks/sms`, `/webhooks/ivrs` | Provider signature | Delivery receipts |
| GET | `/health`, `/ready` | none | Platform probes (outside `/api/v1` if preferred) |

### 14.5 Error code reference

| HTTP | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod failed on body/query/params |
| 400 | `INVALID_REQUEST` | Logically invalid (e.g. expiry before now) |
| 400 | `CONFIRM_TEXT_MISMATCH` | Destructive action confirmation wrong |
| 401 | `UNAUTHORIZED` | No token |
| 401 | `TOKEN_EXPIRED` | Access token expired → client refreshes |
| 401 | `TOKEN_INVALID` | Tampered / wrong secret |
| 401 | `REFRESH_TOKEN_INVALID` | Not found or already rotated |
| 401 | `INVALID_CREDENTIALS` | Wrong email/password (generic) |
| 403 | `FORBIDDEN` | Wrong role |
| 403 | `ACCOUNT_LOCKED` | Too many failed logins |
| 403 | `EMAIL_NOT_VERIFIED` | Action requires verified email |
| 404 | `NOT_FOUND` | Missing or not yours / out of scope |
| 409 | `CONFLICT` | Duplicate / invalid state transition |
| 413 | `PAYLOAD_TOO_LARGE` | Upload too big |
| 422 | `UNSUPPORTED_MEDIA` | Bad file type |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 502 | `PROVIDER_ERROR` | SMS/IVRS/ingest provider failed |
| 500 | `INTERNAL_ERROR` | Unhandled; check Sentry |

---

## 15. Backend Security Checklist

Run before every production deployment.

### Environment & configuration
- [ ] All secrets in env; none hardcoded
- [ ] `.env` / `.env.*` ignored; `.env.example` committed
- [ ] Env validated with Zod at startup
- [ ] Access and refresh secrets differ; each ≥ 64 chars
- [ ] `ENCRYPTION_KEY` is 64 hex chars, env only
- [ ] MongoDB user is restricted (not root); Atlas IP allowlist set

### Authentication
- [ ] Access 15 min; refresh 7 days
- [ ] Access token only in `Authorization` header
- [ ] Refresh in `HttpOnly; Secure; SameSite=Strict` cookie
- [ ] Refresh hashed in DB, rotated each use; reuse → revoke all sessions
- [ ] `timingSafeEqual` for all token comparisons
- [ ] Lockout after 5 failures for 15 min
- [ ] Generic login/reset/invite messages (no email enumeration)
- [ ] Email verification and reset tokens are single-use, hashed, TTL'd
- [ ] Staff accounts invite-only; self-registration cannot create officer/field_officer/admin
- [ ] Users can view and revoke sessions

### API security
- [ ] `helmet()`, strict `cors()` allowlist, `mongo-sanitize`, rate limits, `json({limit})`
- [ ] Zod validation on every route (body, query, params)
- [ ] Role guard **and** scope check on every protected route
- [ ] `assertOwnership()` / `assertInScope()` everywhere; 404 not 403
- [ ] Alert approval limited to `officer`; AuditLog written for create/approve/cancel
- [ ] Public report endpoint: captcha, strict per-IP limit, size limits, no auth bypass to other data
- [ ] Internal ingest endpoint: machine token, IP allowlist, not callable with user JWT
- [ ] Provider webhooks verify signatures
- [ ] Geo inputs validated (valid lat/lng ranges, bounded bbox sizes to prevent heavy queries)
- [ ] Uploads: magic-byte type check, size caps, safe storage, no direct execution
- [ ] Soft-delete filters on queries

### Data & privacy
- [ ] Bcrypt cost ≥ 10; no plaintext passwords
- [ ] Family phone numbers / sensitive contact data encrypted at rest (AES-256-GCM)
- [ ] Public endpoints return **no** personal data (no reporter identity, no exact private locations)
- [ ] Reports shown publicly only when Verified and location generalised
- [ ] `GET /users/me/export` and `DELETE /users/me` (with confirmation text)
- [ ] TTL indexes: invites, login attempts, notifications (by policy), unverified report media (by policy)
- [ ] Privacy Policy and Terms pages published; consent captured for SMS/IVRS opt-in

### Infrastructure
- [ ] `/health` and `/ready` implemented
- [ ] Winston structured logs with **no passwords, tokens, API keys, phone numbers or raw PII**
- [ ] Sentry configured with data scrubbing
- [ ] `npm audit` has no high/critical findings
- [ ] Dependabot/Snyk enabled; `npm ci` in CI
- [ ] HTTPS enforced; HSTS via helmet
- [ ] Cron jobs run on a single instance (or use locks)
- [ ] Backups configured for MongoDB; restore tested once
- [ ] Alert dispatcher tested with a **sandbox/test number** before real sends

---

## 16. Frontend Architecture

### 16.1 Rendering strategy (Next.js)

| Area | Strategy | Why |
|---|---|---|
| Public pages (`/`, `/about`, `/alerts`, `/risk-map`) | Server components + ISR/revalidate for alert and status data | Fast first load on weak networks, SEO |
| Auth pages | Client components | Forms |
| Portals (`/officer`, `/citizen`, `/field`, …) | **Client-rendered** with TanStack Query | Access token lives in memory, so server components cannot call the API as the user |
| Maps | Client-only, dynamically imported (`ssr: false`) | Map libraries need the DOM |

### 16.2 Axios client & token handling

Use the blueprint pattern unchanged in spirit:

- `client.ts`: Axios with `baseURL = NEXT_PUBLIC_API_BASE_URL + '/api/v1'`, `withCredentials: true`, request interceptor adds `Authorization`, response interceptor does a **single-flight refresh** on `TOKEN_EXPIRED`.
- `refreshClient.ts`: separate instance with **no interceptors** to avoid loops.
- `tokenStore.ts`: **in-memory only**; never `localStorage`/`sessionStorage`.
- On refresh failure: clear store, redirect to `/login`.
- `AuthProvider` bootstraps with `POST /auth/refresh` then `GET /users/me`.

### 16.3 Route protection

- `RequireAuth` client wrapper with **role check** (`allowedRoles`), redirect to `/login` with `from` state or to the user's own portal if role mismatches.
- Next middleware may do a coarse redirect using a **non-sensitive presence cookie** (only if same-site), but real authorization always happens on the API.
- Redirect after login → `from` route or role home (`officer → /officer/dashboard`, etc.).

### 16.4 TanStack Query conventions

- Query keys: `['alerts', params]`, `['reports', filters]`, `['village', id]`.
- Mutations invalidate relevant keys.
- Polling or SSE for: dashboard summary, alert deliveries, new reports.
- Persist selected queries (citizen area, safe place, offline bundle) to IndexedDB for offline use.

### 16.5 Map architecture

- `MapView` wrapper with props: `layers`, `onFeatureClick`, `bounds`, `readOnly`.
- Layer registry: risk zones, rainfall, SAR change, slope, roads, villages, schools, hospitals, blocked roads, shelters.
- Public map: major-NH only, simplified geometry; Officer map: full detail with side panel.
- Citizen map: simplified, high-contrast, legend with icons, offline tiles for the user's village if licensing allows.
- Always show **"Last updated"** and a legend with icons + labels.

### 16.6 PWA / offline

- Manifest + service worker; cache app shell and static illustrations.
- Runtime cache for `/me/offline-bundle`, safe-place route and emergency contacts.
- Background sync queue for reports (with `clientId` for idempotency).
- UI banner when offline; disable actions that need network (e.g. alert approval).

### 16.7 UI component list (build once, reuse)

`Header`, `Sidebar`, `Footer`, `RiskBadge`, `AlertLevelBadge`, `StatCard`, `MapView`, `LayerToggle`, `Legend`, `DataTable`, `FilterBar`, `StatusPill`, `ReportCard`, `TaskCard`, `AlertComposer`, `DeliveryStatusTable`, `LanguageSwitcher`, `VoicePlayButton`, `EmptyState`, `ErrorState`, `Skeleton`, `ConfirmDialog`, `OfflineBanner`.

---

## 17. Frontend Security Checklist

### Token & session
- [ ] Access token in memory only
- [ ] Refresh token is HttpOnly cookie
- [ ] Single-flight refresh; failed refresh → clear + redirect
- [ ] No tokens/PII in console or analytics events
- [ ] Offline storage (IndexedDB/cache) holds **no tokens or passwords**

### XSS
- [ ] No `dangerouslySetInnerHTML` without DOMPurify
- [ ] User content (report descriptions, notes) rendered as text
- [ ] Alert messages rendered as text (templates are plain text)
- [ ] URLs from user input validated (`http:`/`https:` only)
- [ ] CSP configured (Next.js headers and/or backend helmet) and tested with maps/fonts/images
- [ ] Map popups built from text nodes, not HTML strings of user data

### CSRF
- [ ] State-changing calls use `Authorization` header
- [ ] Refresh cookie is `SameSite=Strict`; no state change on GET

### Dependencies
- [ ] `npm audit` clean (high/critical)
- [ ] No secrets in `NEXT_PUBLIC_*`
- [ ] Env validated with Zod at build/start

### Data handling
- [ ] Forms validated with React Hook Form + Zod
- [ ] API errors shown as friendly messages
- [ ] Loading, error and empty states for every async view
- [ ] Paginated lists; map queries bounded by viewport
- [ ] Uploads validated client-side (type/size) and server-side
- [ ] Geolocation permission requested only when the user taps Report; clear explanation shown

### Route security
- [ ] Every portal wrapped in role-aware `RequireAuth`
- [ ] 404 and error pages exist
- [ ] Login redirects to `from` or role home
- [ ] Public report form has captcha and clear privacy notice

---

## 18. Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Performance** | Public pages LCP ≤ 2.5 s on 4G; citizen portal usable on low-end Android; map initial render ≤ 3 s; images lazy-loaded; illustrations as optimised SVG/WebP |
| **Availability** | Target ≥ 99.5% during monsoon season; health checks; graceful degradation if SMS/IVRS provider is down (fallback channel + visible failure in Alert Center) |
| **Reliability** | Alert dispatch idempotent; retries with caps; audit trail for every alert |
| **Scalability** | Alert fan-out must handle tens of thousands of recipients; use batching and a queue if volume demands (start with cron + batch, move to a queue if needed) |
| **Accessibility** | WCAG AA contrast, keyboard navigation, screen-reader labels, icon + text for risk, read-aloud in citizen portal, reduced-motion support |
| **Localisation** | Multiple languages, local number/date formats, voice scripts per language |
| **Privacy** | Minimal data collection; consent for SMS/IVRS; precise location only on user action; retention policy documented |
| **Observability** | Structured logs, Sentry, delivery metrics, data-freshness indicators |
| **Browser support** | Latest two versions of Chrome, Edge, Firefox, Safari; Android Chrome priority |
| **Compliance** | India SMS/DLT rules, applicable data-protection law, government hosting/data-residency requirements if the client is a state agency (confirm) |

---

## 19. AI Workflow, CI & Git Hygiene

### Secrets & model context
- Never paste real `.env` values, keys, connection strings or private keys into AI chat.
- Treat AI output as untrusted; review diffs like a junior PR, especially auth, geo queries and the alert dispatcher.
- Watch for prompt injection in READMEs, issues and data files.

### Dependency safety
- Confirm each package name on npmjs.com before installing (typos / hallucinated names / slopsquatting).
- Search for advisories on each package, per the Version Safety Rule at the top.
- Commit the lockfile; use `npm ci` in CI.

### `.cursorignore`

```gitignore
.env
.env.*
!.env.example
node_modules/
.next/
dist/
build/
coverage/
*.pem
*.key
```

### CI baseline (every PR)

| Step | Command | Purpose |
|---|---|---|
| Install | `npm ci` in `backend/` and `frontend/` | Reproducible installs |
| Lint | `npm run lint` | Style and common bugs |
| Typecheck | `npx tsc --noEmit` | Type errors |
| Test | `npm test` | Regressions (triage scoring, alert dispatcher, geo helpers first) |
| Build | `npm run build` | Next.js and backend build succeed |
| SCA | `npm audit --audit-level=high` | Vulnerable dependencies |
| Secrets | gitleaks / GitHub secret scanning | No keys on `main` |

### Not covered by this document
- MFA/passkeys for officers (strongly consider for staff accounts after the prototype)
- Formal penetration test (recommended before real public alerts go live)
- Legal/compliance review of SMS/IVRS consent and data retention

---

## 20. Postman & Testing Guide

### Collection setup
1. Import `backend/postman/collection.json` and `environment.json`.
2. Set `baseUrl` to `http://localhost:5000`; leave token variables empty.

### Suggested run order
```
1  POST /auth/register          (citizen)
2  POST /auth/login             → access token + refresh cookie
3  GET  /users/me
4  GET  /me/area
5  POST /reports                → create report
6  POST /auth/login             (officer test account)
7  GET  /officer/dashboard
8  GET  /reports                → see new report, triage priority
9  PATCH /reports/:id/status    → verified
10 POST /alerts                 → draft
11 POST /alerts/:id/approve     → test mode provider
12 GET  /alerts/:id/deliveries
13 POST /auth/login             (field officer)
14 GET  /field/tasks → PATCH /field/roads/:id/status
15 POST /auth/refresh → POST /auth/logout → GET /users/me (expect 401)
```

### Scenarios to test for every endpoint

| Test | How |
|---|---|
| Happy path | Valid request |
| Validation error (400) | Missing/invalid field |
| Unauthorized (401) | No header |
| Token expired (401) | Expired token |
| Forbidden (403) | Wrong role (e.g. citizen calling `/alerts/:id/approve`) |
| Not found / out of scope (404) | Another user's or other area's resource |
| Conflict (409) | Approve an already approved alert |
| Rate limited (429) | 11+ auth requests/min; many public reports |
| Lockout | 5 wrong passwords |
| Idempotency | Approve twice; submit the same offline report `clientId` twice |

### Domain-specific tests
- **Triage:** report inside Critical zone with 3 nearby reports → `high`; anonymous report with no GPS → `unverified`.
- **Geo:** point-in-polygon for village→zone; road/zone intersection; invalid coordinates rejected.
- **Alert audience resolution:** village + road corridor audiences produce the expected recipients without duplicates.
- **Offline:** simulate network loss; confirm citizen safe-place and contacts still render; reports queue and sync.
- **Provider failure:** force SMS failure → status `failed`, retry works, Alert Center shows it.

---

## 21. Master Prompts

> Fill placeholders and paste into your AI assistant. Always attach this PRD as context.

### 21.1 Full-stack bootstrap prompt

```
Build the Terra360 landslide early-warning platform from the attached PRD (Terra360_PRD.md).

Stack:
- frontend/: Next.js (App Router) + React + TypeScript + Tailwind CSS
- backend/: Node.js + Express + TypeScript + MongoDB (Mongoose)
- Auth: email + password only (no OAuth)

Before writing any package.json: web search each dependency for latest stable + security
advisories, confirm with `npm show <pkg> version`, and tell me what you verified. Never copy
versions from the PRD.

Brand: Terra360. Tailwind tokens: forest #173D32, ochre #D6A65D, mist #DCE8D4, cloud #F6F4EC.

Backend:
- Structure per PRD §10: config/env.ts (Zod, crash on bad config), db.ts, app.ts, server.ts;
  modules under src/modules/<resource>/ with model + routes + controller + service + schema
- Auth per §7.1: register (citizen/driver), invite-only staff, email verification, reset,
  login with lockout, JWT access 15m (JSON) + refresh 7d (HttpOnly Secure SameSite=Strict
  cookie, hashed, rotated, reuse → revoke all), sessions list/revoke
- Middleware order per §13.1
- Standard response and error shapes per §13.3 / §14.5
- Role guard + scope checks; assertOwnership() returns 404, never 403
- crypto.timingSafeEqual for token comparisons
- Zod validation on every route
- Mongo 2dsphere indexes for zones, villages, roads, shelters, reports
- Alert lifecycle per §7.2: draft → approved → dispatched, idempotent dispatcher with SMS/IVRS/in-app
  adapters (provider interface + a mock provider for development), delivery receipts via webhooks
- Report triage per §7.3 (rule-based scoring, unit-tested)
- Internal model-run ingest endpoint with machine token (§13.5)
- node-cron jobs per §13.7
- Winston logging with redaction; Sentry with scrubbing
- GET /health and GET /ready
- Seed script: districts, areas, villages, major NH road segments, shelters, one account per role,
  sample risk zones, templates

Frontend:
- Zod-validated env in src/lib/env.ts
- Axios client + single-flight refresh + separate refreshClient; in-memory tokenStore
- AuthProvider bootstrap; role-aware RequireAuth; redirect to role home
- TanStack Query for server state; React Hook Form + Zod for forms; DOMPurify where needed
- Layout: Header (logo, mountain band, bell, avatar), Sidebar nav per portal, Footer (dark forest,
  About / Privacy / Terms / Contact, LinkedIn/Instagram/GitHub, © 2026)
- Public: Home (hero, 3 CTAs, NH-only risk map preview, alerts, report danger), Risk Map, Alerts,
  Report, About/Contact, Login/Register
- Officer: Dashboard, Live Risk Map (layers + zone detail), Road Impact, Alert Center, Safe Routes,
  Villages/Population, Field Reports
- Citizen: Home, My Area Risk, Safe Place (offline cached), Report, Profile
- Field Officer: My Tasks, Assigned Area Map, Reports, Road Status, Alerts, Profile
- (Optional, last) Driver and Admin portals per PRD §6.6–6.7
- PWA + offline cache for citizen area/safe place; offline report queue
- Risk shown with icon + label + colour (never colour alone); WCAG AA

Build in milestones (PRD §22). Start with P0 + public site + auth, then stop and summarise.

Deliverables:
1. .env.example for backend and frontend with comments
2. Root .gitignore and .cursorignore (PRD §10, §19)
3. README: install, seed, run, CI commands
4. GitHub Actions workflow (npm ci, lint, tsc, test, build, npm audit)
5. Postman collection + environment under backend/postman/
6. tsconfig strict mode for both apps
7. API docs for each endpoint using the PRD §14.1 template
```

### 21.2 Backend-only prompt

```
Build the Terra360 backend from PRD §6, §7, §12–§15: Express + TypeScript + MongoDB, email auth
only, role-based portals (officer, citizen, driver, field_officer, admin), alert lifecycle with
SMS/IVRS/in-app dispatcher (provider adapters + mock), report triage, risk zones with geo
queries, internal model-run ingest, cron jobs, health/ready endpoints.

Verify all dependency versions via web search + `npm show` first (state what you verified).
Deliver: .env.example, README, seed script, Postman collection, endpoint docs per §14.1.
```

### 21.3 Frontend-only prompt

```
Build the Terra360 frontend from PRD §5, §6, §8, §16: Next.js App Router + Tailwind CSS with the
brand tokens, public site + officer/citizen/field portals, MapView with layer toggles, in-memory
token auth with refresh interceptor, TanStack Query, PWA offline for citizen pages.
Use a mock API layer (MSW or a local json server) if the backend is not ready.
Verify all dependency versions via web search + `npm show` first.
```

### 21.4 Security hardening prompt

```
Audit this Terra360 codebase against PRD §15 and §17. Report gaps and fix them:
1. Staff accounts invite-only; cannot self-register as officer/admin
2. Role guard + scope checks on every route; 404 not 403 for out-of-scope
3. Refresh token hashed, rotated, reuse → revoke all; lockout 5/15min
4. Generic auth/reset messages; single-use hashed tokens
5. helmet, CORS allowlist, mongo-sanitize, rate limits, body limits
6. Public report endpoint: captcha, per-IP limits, upload validation
7. Internal ingest + provider webhooks authenticated (machine token / signatures)
8. Alert approval audit logging and idempotent dispatch
9. Encrypted sensitive fields (family contacts); no PII in logs
10. Map popups/alerts/reports rendered as text; DOMPurify where HTML is unavoidable
11. No tokens in localStorage/IndexedDB; env validated; no secrets in NEXT_PUBLIC_*
12. CSP works with the map library; HTTPS/HSTS
13. npm audit clean; gitignore/cursorignore correct
```

### 21.5 Feature prompts (append to the master prompt)

**Alert Center**
```
Implement the Alert Center per PRD §6.3(d) and §7.2: composer (level, audience, channels, local-language
preview), approve with confirm for Critical, delivery status table (sent / delivered / voice completed /
failed) with retry, audit log, idempotent dispatcher, mock SMS/IVRS provider for dev.
```

**Report triage**
```
Implement report triage per PRD §7.3 as a pure, unit-tested scoring function with inputs: type, GPS
accuracy, zone risk, similar nearby reports, reporter trust, photo presence, rainfall. Output priority
(high/medium/low/unverified) + explanation array. Route High to officer queue, Medium to nearby field
officers/volunteers, Low/unverified hidden from public.
```

**Offline citizen mode**
```
Implement PWA offline for citizen My Area, Safe Place and emergency contacts per PRD §7.4 and §16.6:
service worker caching, IndexedDB persistence for the offline bundle, offline report queue with
clientId idempotency, "last synced" labels, offline banner. No tokens in offline storage.
```

**Live Risk Map**
```
Implement the officer Live Risk Map per PRD §6.3(b) and §16.5 with MapLibre/Leaflet: layers (rainfall,
SAR change, slope, roads, villages, schools, hospitals, blocked roads), zone click → side panel with
factors, affected roads/villages, population, recent reports, "Create alert" shortcut. Bound queries by
viewport and simplify geometry by zoom.
```

---

## 22. Milestones

| # | Milestone | Deliverables | Done when |
|---|---|---|---|
| **M0** | Foundation | Repo, strict TS, env validation, CI, Tailwind tokens, Header/Sidebar/Footer, health endpoints | CI green; layout matches design |
| **M1** | Auth & roles | Register/login/refresh/logout, verification, reset, invites, lockout, role guards, `RequireAuth` | All roles can log in to empty portals; security tests pass |
| **M2** | Public website | Home, public risk map (NH only), Alerts, Report danger, About/Contact | Public pages work on mobile; report submits to DB |
| **M3** | Risk data & map | Seed data, risk zone model, ingest endpoint, Officer Live Risk Map, Dashboard | Zones render with layers; dashboard cards live |
| **M4** | Alerts | Alert Center, templates, dispatcher with mock provider, delivery status | End-to-end draft → approve → deliveries (mock) |
| **M5** | Reports & field work | Triage, Field Reports, tasks, field officer portal, road status updates | Report → triage → task → verified → road status visible to officer |
| **M6** | Citizen portal & offline | Home, My Area, Safe Place, Report, Profile, PWA offline | Works offline after one online visit |
| **M7** | Real providers & hardening | Real SMS/IVRS (sandbox first), security checklist, pen-test-style review, load test dispatcher | Checklists complete; staged send succeeds |
| **M8** | Optional | Driver portal, Admin portal, web push, voice-note reports, volunteer network | As time permits |

---

## 23. Risks & Open Questions

### Risks

| Risk | Impact | Mitigation |
|---|---|---|
| False alarms erode trust | Public ignores alerts | Human approval, report triage, show confidence/factors, post-event review |
| Missed warnings (model gap) | Safety harm | Clear disclaimers; treat Terra360 as decision support; officer override; data-freshness warnings |
| SMS/IVRS delivery failure | Alerts don't arrive | Multi-channel, retries, visible failure states, test sends |
| India SMS compliance (DLT/templates) | Messages blocked | Register sender/templates early; template IDs in AlertTemplate |
| Cross-site cookie failure | Users logged out constantly | Same-site deployment or Next.js proxy (see §7.1 note) |
| Low connectivity | App unusable when needed | PWA offline, SMS/IVRS fallback |
| Language/literacy barriers | Misunderstood alerts | Icons, voice, human-reviewed translations |
| Data licensing for satellite/rain/map tiles | Legal/cost issues | Confirm licences; prefer open data sources |
| Citizens without email | Cannot register | See open question 2 |

> **Safety note:** this product informs life-safety decisions. Treat predictions as *probabilistic*, validate with domain experts (geologists, disaster management authorities), and run drills before real use.

### Open questions (need your decision)

1. **Which block is "Optional for now"** in the Officer portal (Villages/Population, Field Reports, or something else)?
2. **Citizen sign-up without email:** assisted registration, SMS/IVRS-only enrolment, or phone OTP later?
3. **Who may approve Critical alerts**: single officer or two-person approval?
4. **Languages** to support at launch (Assamese, Bengali, Hindi, Manipuri, Nagamese, Mizo…)?
5. **SMS/IVRS provider** and budget; do you already have DLT registration?
6. **Model service:** who builds/hosts it, and what output format (GeoJSON polygons + score)?
7. **Data sources** for rainfall, SAR and slope/DEM, and their licences.
8. **Hosting / data residency:** is a government or India-region host required?
9. **Admin approval powers:** should Admin ever be able to approve alerts?
10. **Scope of "major NH"** in the prototype: which highways/states?
11. **Volunteers** (Medium-priority verification): are they a role in the system, or just citizens with a flag?
12. **Spelling:** the plan says both "Tera360" and "Terra360". This PRD uses **Terra360** (per your brand name and logo).

---

## 24. Document Maintenance

**Update this file when:**

- A new integration is added (maps, payments, push, storage): update env examples, Zod schema, and relevant prompts.
- Auth strategy changes (e.g. phone OTP, MFA for staff): update §7.1, §15 and prompts.
- A page or feature is added to the plan: update §5, §6, §14 catalog and §22 milestones.
- A **CVE** affects a dependency: rotate secrets if exposed, upgrade to a patched release (verify via search + `npm audit`), record it in your changelog. Do not add version pins here.
- Deploying to a new host: re-verify cookie `Secure`/`SameSite`, CORS origins, same-site setup and HTTPS.

**Security review triggers:** any change to cookie attributes, CORS origins, SMS/IVRS provider, alert approval rules, or any new public (no-auth) endpoint.

**AI assistant instruction:** when using this document as context, follow the **Version Safety Rule** at the top: web search each dependency (`"<pkg> npm latest version"`, `"<pkg> CVE"`), confirm with `npm show <pkg> version` when a shell is available, state what you verified, and never copy semver literals from this file into `package.json`.

---

*Terra360: know the danger before it blocks the road.*
