/**
 * Terra360 Field Officer Portal Routes
 * 
 * Scoped under /api/field-officer (or /api/v1/field-officer).
 * Routes handle:
 * 1. Officer Profile & Language Preferences
 * 2. My Inspection Tasks (Fetch, Start, Complete, Escalate)
 * 3. Assigned Sector Map & GeoJSON Boundaries
 * 4. Citizen/Villager Reports (Verify, Reject, Escalate)
 * 5. Road Status Real-time Updates & Central Dashboard Sync
 * 6. Sector Emergency Alerts & Acknowledgments
 */

const { fieldOfficerController } = require('../controllers/fieldOfficerController');

let express;
try {
  express = require('express');
} catch (err) {
  // Graceful fallback stub for offline / pre-install test environments
}

// Support both standard Express router and standalone mock router
let router;
if (express && typeof express.Router === 'function') {
  router = express.Router();
} else {
  router = function (req, res, next) {
    if (typeof next === 'function') next();
  };
  router.stack = [];
  ['get', 'post', 'patch', 'put', 'delete', 'use'].forEach((method) => {
    router[method] = function (path, ...handlers) {
      router.stack.push({ method: method.toUpperCase(), path, handlers });
      return router;
    };
  });
}

// ── Officer Profile & Context ───────────────────────────────────────────────
// GET /api/field-officer/profile
router.get('/profile', (req, res, next) => fieldOfficerController.getProfile(req, res, next));

// PATCH /api/field-officer/profile/language
router.patch('/profile/language', (req, res, next) => fieldOfficerController.updateLanguage(req, res, next));

// ── My Tasks ────────────────────────────────────────────────────────────────
// GET /api/field-officer/tasks
router.get('/tasks', (req, res, next) => fieldOfficerController.getTasks(req, res, next));

// PATCH /api/field-officer/tasks/:id/start
router.patch('/tasks/:id/start', (req, res, next) => fieldOfficerController.startTask(req, res, next));

// PATCH /api/field-officer/tasks/:id/complete
router.patch('/tasks/:id/complete', (req, res, next) => fieldOfficerController.completeTask(req, res, next));

// POST /api/field-officer/tasks/:id/escalate
router.post('/tasks/:id/escalate', (req, res, next) => fieldOfficerController.escalateTask(req, res, next));

// ── Assigned Area Map ───────────────────────────────────────────────────────
// GET /api/field-officer/map/data
router.get('/map/data', (req, res, next) => fieldOfficerController.getMapData(req, res, next));

// ── Villager Reports ────────────────────────────────────────────────────────
// GET /api/field-officer/reports
router.get('/reports', (req, res, next) => fieldOfficerController.getReports(req, res, next));

// PATCH /api/field-officer/reports/:id/verify
router.patch('/reports/:id/verify', (req, res, next) => fieldOfficerController.verifyReport(req, res, next));

// PATCH /api/field-officer/reports/:id/reject
router.patch('/reports/:id/reject', (req, res, next) => fieldOfficerController.rejectReport(req, res, next));

// POST /api/field-officer/reports/:id/escalate
router.post('/reports/:id/escalate', (req, res, next) => fieldOfficerController.escalateReport(req, res, next));

// ── Road Status Updates ─────────────────────────────────────────────────────
// GET /api/field-officer/road-status/current
router.get('/road-status/current', (req, res, next) => fieldOfficerController.getCurrentRoadStatus(req, res, next));

// POST /api/field-officer/road-status/update
router.post('/road-status/update', (req, res, next) => fieldOfficerController.updateRoadStatus(req, res, next));

// ── Sector Alerts ───────────────────────────────────────────────────────────
// GET /api/field-officer/alerts
router.get('/alerts', (req, res, next) => fieldOfficerController.getAlerts(req, res, next));

// PATCH /api/field-officer/alerts/:id/acknowledge
router.patch('/alerts/:id/acknowledge', (req, res, next) => fieldOfficerController.acknowledgeAlert(req, res, next));

module.exports = router;
module.exports.fieldOfficerRouter = router;
