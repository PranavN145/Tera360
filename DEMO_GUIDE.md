# Terra360 — Operational Demo Guide & Presentation Walkthrough

This document outlines the demonstration accounts, role clearances, and instructions for configuring **Demo Login Mode** in the Terra360 platform.

---

## 1. Quick Demonstration Accounts

All demo accounts are seeded with secure development credentials and assigned explicit role clearances:

| Role | Name | Email Address | Password | Clearances & Responsibilities | Destination Route |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Operations Officer** | Vikram Sharma | `officer@terra360.in` | `Password123!` | Regional early warning, corridor blockage supervision, emergency alert broadcasts | `/officer/dashboard` |
| **Field Response Officer** | Temsu Jamir | `field@terra360.in` | `Password123!` | On-ground geotechnical dispatch, sensor telemetry calibration, road clearance verification | `/field/tasks` |
| **Community Resident** | Priyam Hazarika | `citizen@terra360.in` | `Password123!` | Community landslide reports, safe-haven shelter routes, localized safety alerts | `/citizen/home` |
| **Commercial Driver** | Rongsen Ao | `driver@terra360.in` | `Password123!` | Highway freight transit checks, NH-29/NH-10 corridor status | `/driver/route-check` |
| **System Administrator** | System Admin | `admin@terra360.in` | `Password123!` | Role assignments, system telemetry audits, security session management | `/admin/users` |

---

## 2. Enabling and Disabling Demo Mode

### Configuration Environment Variable

Demo login controls are explicitly gated behind the `NEXT_PUBLIC_DEMO_MODE` environment variable in `frontend/.env.local`:

```bash
# Enable Demo Mode (displays 1-click role buttons on /login)
NEXT_PUBLIC_DEMO_MODE=true

# Disable Demo Mode (strictly enforces regular email/password login for production)
NEXT_PUBLIC_DEMO_MODE=false
```

### Production Security Safeguards
1. **No Credentials in Production Build**: When `NODE_ENV=production` and `NEXT_PUBLIC_DEMO_MODE=false` (the default), demo cards and accounts are completely excluded from the rendered interface.
2. **Real Authentication Enforced**: Demo logins submit real cryptographic requests to `/api/v1/auth/login`. No password checks or JWT verification layers are bypassed.
3. **Session Cookie Security**: Authenticated sessions issue `HttpOnly`, `SameSite=None` (or `Lax`), `Secure` refresh cookies and short-lived in-memory access tokens.

---

## 3. Step-by-Step Presentation Walkthrough

### Scenario A: Operations Officer Workflow
1. Navigate to `http://localhost:3000/login`.
2. Under **Demo Login Mode**, click **"Continue as Officer"** (or click the card to inspect `officer@terra360.in`).
3. You are authenticated and redirected to `/officer/dashboard`.
4. Review the operational metrics (Active Alerts, High-Risk Corridors, Evacuation Shelters).
5. Switch between tabs (**Road Clearance**, **Risk Map**, **Villages**):
   - Notice that the Header, Sidebar, and Footer remain persistent with zero layout shifts or image reloads.
6. Refresh the browser (`F5` or `Ctrl+R`):
   - Notice that the page restores cleanly without flashing the public homepage or logging out.

### Scenario B: Role Switching & Session Revocation
1. In the top-right header, click the user profile avatar (`VS`) to open the account dropdown.
2. Click **"Sign Out"**:
   - The session is terminated on the backend, cookies cleared, and you return to `/login`.
3. Under **Demo Login Mode**, click **"Continue as Field Officer"**.
4. You are routed to `/field/tasks` with field-specific operational views.

### Scenario C: Citizen Community Reporting
1. Sign out and click **"Continue as Citizen"**.
2. You are routed to `/citizen/home`.
3. Test reporting an incident or checking nearby safe shelters (`/citizen/safe-place`).
4. Use the top-left **"Back"** button to return cleanly through breadcrumb levels.

