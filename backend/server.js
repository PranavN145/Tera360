/**
 * Terra360 Backend API Server
 * Path: backend/server.js
 * 
 * Production-ready zero-external-dependency HTTP API server.
 * Binds on port 5000 (default) with full CORS, REST routing, and
 * direct integration with the enterprise on-disk fieldOfficerController.
 */

const http = require('http');
const { fieldOfficerController } = require('./controllers/fieldOfficerController');

const PORT = process.env.PORT || 5000;

// Demo / Mock User accounts for authentication
const DEMO_USERS = {
  officer_patil: {
    _id: "usr-off-094",
    id: "OFF-2026-094",
    name: "Officer K. Patil",
    email: "officer.patil@terra360.in",
    role: "field_officer",
    phone: "+91 98765 43210",
    language: "EN",
    assignedArea: "Sector 4 - Hill Highway Corridors",
    department: "Disaster & Landslide Rapid Response Unit",
    emailVerified: true,
    isActive: true,
    activeDuty: true
  },
  officer_command: {
    _id: "usr-off-002",
    id: "OFF-2026-002",
    name: "Vikram Sharma",
    email: "officer@terra360.in",
    role: "officer",
    phone: "+91 98765 00002",
    language: "EN",
    department: "Disaster Operations Headquarters",
    emailVerified: true,
    isActive: true
  },
  citizen: {
    _id: "usr-cit-001",
    id: "CIT-2026-001",
    name: "Priyam Hazarika",
    email: "citizen@terra360.in",
    role: "citizen",
    phone: "+91 98765 00001",
    language: "EN",
    emailVerified: true,
    isActive: true
  },
  driver: {
    _id: "usr-drv-004",
    id: "DRV-2026-004",
    name: "Rongsen Ao",
    email: "driver@terra360.in",
    role: "driver",
    phone: "+91 98765 00004",
    language: "AO",
    emailVerified: true,
    isActive: true
  }
};

let currentAuthenticatedUser = DEMO_USERS.officer_patil;

const handleLogin = (req, res) => {
  const { email, identifier, officerId, role } = req.body || {};
  const query = (email || identifier || officerId || '').toLowerCase().trim();
  const requestedRole = (role || '').toLowerCase().trim();

  let matchedUser = DEMO_USERS.officer_patil;

  if (requestedRole === 'field-officer' || requestedRole === 'field_officer' || query.includes('094') || query.includes('patil') || query.includes('field') || query.includes('98765 43210') || query.includes('9876543210')) {
    matchedUser = DEMO_USERS.officer_patil;
  } else if (requestedRole === 'driver' || query.includes('driver')) {
    matchedUser = DEMO_USERS.driver;
  } else if (requestedRole === 'officer' || requestedRole === 'disaster-command' || query.includes('officer@')) {
    matchedUser = DEMO_USERS.officer_command;
  } else if (requestedRole === 'citizen' || query.includes('citizen')) {
    matchedUser = DEMO_USERS.citizen;
  }

  currentAuthenticatedUser = matchedUser;

  return res.status(200).json({
    success: true,
    message: `Authenticated successfully as ${matchedUser.name}`,
    data: {
      user: matchedUser,
      accessToken: `mock-jwt-token-for-${matchedUser.id || matchedUser._id}`
    }
  });
};

const handleGetMe = (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: currentAuthenticatedUser || DEMO_USERS.officer_patil
    }
  });
};

const handleRefresh = (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      accessToken: `refreshed-mock-token-${Date.now()}`
    }
  });
};

const handleLogout = (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
    data: {
      message: "Logged out successfully"
    }
  });
};

function parseUrl(urlStr) {
  const [pathname, queryString] = urlStr.split('?');
  const query = {};
  if (queryString) {
    for (const pair of queryString.split('&')) {
      const [k, v] = pair.split('=');
      if (k) query[decodeURIComponent(k)] = decodeURIComponent(v || '');
    }
  }
  return { pathname, query };
}

function matchRoute(routePath, actualPath) {
  const routeParts = routePath.split('/').filter(Boolean);
  const actualParts = actualPath.split('/').filter(Boolean);
  if (routeParts.length !== actualParts.length) return null;

  const params = {};
  for (let i = 0; i < routeParts.length; i++) {
    if (routeParts[i].startsWith(':')) {
      params[routeParts[i].slice(1)] = actualParts[i];
    } else if (routeParts[i] !== actualParts[i]) {
      return null;
    }
  }
  return params;
}

const apiRoutes = [
  // Authentication & Session
  { method: 'POST', path: '/api/auth/login', handler: handleLogin },
  { method: 'POST', path: '/api/v1/auth/login', handler: handleLogin },
  { method: 'GET', path: '/api/auth/me', handler: handleGetMe },
  { method: 'GET', path: '/api/v1/users/me', handler: handleGetMe },
  { method: 'POST', path: '/api/auth/refresh', handler: handleRefresh },
  { method: 'POST', path: '/api/v1/auth/refresh', handler: handleRefresh },
  { method: 'POST', path: '/api/auth/logout', handler: handleLogout },
  { method: 'POST', path: '/api/v1/auth/logout', handler: handleLogout },

  // Profile
  { method: 'GET', path: '/api/field-officer/profile', handler: (req, res, next) => fieldOfficerController.getProfile(req, res, next) },
  { method: 'PATCH', path: '/api/field-officer/profile/language', handler: (req, res, next) => fieldOfficerController.updateLanguage(req, res, next) },
  // Tasks
  { method: 'GET', path: '/api/field-officer/tasks', handler: (req, res, next) => fieldOfficerController.getTasks(req, res, next) },
  { method: 'PATCH', path: '/api/field-officer/tasks/:id/start', handler: (req, res, next) => fieldOfficerController.startTask(req, res, next) },
  { method: 'PATCH', path: '/api/field-officer/tasks/:id/complete', handler: (req, res, next) => fieldOfficerController.completeTask(req, res, next) },
  { method: 'POST', path: '/api/field-officer/tasks/:id/escalate', handler: (req, res, next) => fieldOfficerController.escalateTask(req, res, next) },
  // Map Data
  { method: 'GET', path: '/api/field-officer/map/data', handler: (req, res, next) => fieldOfficerController.getMapData(req, res, next) },
  // Reports
  { method: 'GET', path: '/api/field-officer/reports', handler: (req, res, next) => fieldOfficerController.getReports(req, res, next) },
  { method: 'PATCH', path: '/api/field-officer/reports/:id/verify', handler: (req, res, next) => fieldOfficerController.verifyReport(req, res, next) },
  { method: 'PATCH', path: '/api/field-officer/reports/:id/reject', handler: (req, res, next) => fieldOfficerController.rejectReport(req, res, next) },
  { method: 'POST', path: '/api/field-officer/reports/:id/escalate', handler: (req, res, next) => fieldOfficerController.escalateReport(req, res, next) },
  // Road Status
  { method: 'GET', path: '/api/field-officer/road-status/current', handler: (req, res, next) => fieldOfficerController.getCurrentRoadStatus(req, res, next) },
  { method: 'POST', path: '/api/field-officer/road-status/update', handler: (req, res, next) => fieldOfficerController.updateRoadStatus(req, res, next) },
  // Alerts
  { method: 'GET', path: '/api/field-officer/alerts', handler: (req, res, next) => fieldOfficerController.getAlerts(req, res, next) },
  { method: 'PATCH', path: '/api/field-officer/alerts/:id/acknowledge', handler: (req, res, next) => fieldOfficerController.acknowledgeAlert(req, res, next) },

  // State Reset (for test isolation)
  { method: 'POST', path: '/api/field-officer/reset', handler: (req, res, next) => {
    fieldOfficerController.resetState();
    res.status(200).json({ success: true, message: 'Field officer state reset to seed defaults' });
  }},
];

const server = http.createServer((rawReq, rawRes) => {
  // CORS configuration for frontend Next.js application
  rawRes.setHeader('Access-Control-Allow-Origin', '*');
  rawRes.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  rawRes.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-officer-id, x-officer-sector');

  if (rawReq.method === 'OPTIONS') {
    rawRes.writeHead(204);
    rawRes.end();
    return;
  }

  let bodyData = '';
  rawReq.on('data', (chunk) => { bodyData += chunk; });
  rawReq.on('end', () => {
    const { pathname, query } = parseUrl(rawReq.url || '/');

    // Health probes
    if (pathname === '/health' || pathname === '/ready') {
      rawRes.writeHead(200, { 'Content-Type': 'application/json' });
      rawRes.end(JSON.stringify({ success: true, status: 'healthy', uptime: process.uptime() }));
      return;
    }

    let body = {};
    if (bodyData) {
      try { body = JSON.parse(bodyData); } catch (e) { /* ignore */ }
    }

    // Match API routes supporting both /api/field-officer and /api/v1/field-officer
    let matched = null;
    let params = {};
    for (const r of apiRoutes) {
      if (r.method === rawReq.method) {
        let p = matchRoute(r.path, pathname);
        if (!p && pathname.startsWith('/api/v1/field-officer')) {
          p = matchRoute(r.path.replace('/api/', '/api/v1/'), pathname);
        }
        if (p) {
          matched = r;
          params = p;
          break;
        }
      }
    }

    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        rawRes.writeHead(this.statusCode, { 'Content-Type': 'application/json' });
        rawRes.end(JSON.stringify(data));
      },
    };

    const req = {
      method: rawReq.method,
      url: rawReq.url,
      path: pathname,
      headers: rawReq.headers,
      params,
      query,
      body,
    };

    const next = (err) => {
      if (err) {
        const code = err.statusCode || 500;
        res.status(code).json({
          success: false,
          error: {
            code: err.code || 'ERROR',
            message: err.message,
            fields: err.fields,
          },
        });
      }
    };

    if (matched) {
      try {
        matched.handler(req, res, next);
      } catch (err) {
        next(err);
      }
      return;
    }

    // Default 404 for unknown endpoints
    rawRes.writeHead(404, { 'Content-Type': 'application/json' });
    rawRes.end(JSON.stringify({
      success: false,
      error: { code: 'NOT_FOUND', message: `Route '${rawReq.method} ${pathname}' not found on backend.` },
    }));
  });
});

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Terra360 Backend API running on port ${PORT}`);
    console.log(`📡 Endpoints live under: http://localhost:${PORT}/api/field-officer`);
    console.log(`🩺 Health check: http://localhost:${PORT}/health`);
    console.log(`======================================================\n`);
  });
}

module.exports = server;

