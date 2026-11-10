/**
 * Terra360 - Field Officer Controller
 * Path: backend/controllers/fieldOfficerController.js
 */

// Mock in-memory database store
let officerProfile = {
  id: "OFF-2026-094",
  name: "Officer K. Patil",
  department: "Disaster & Landslide Rapid Response Unit",
  assignedArea: "Sector 4 - Hill Highway Corridors",
  phone: "+91 98765 43210",
  language: "EN",
  activeDuty: true
};

let tasks = [
  {
    id: "TSK-401",
    assignedOfficerId: "OFF-2026-094",
    location: {
      name: "NH-58 Km 42+200 (Upper Ridge Cutting)",
      coordinates: [30.1425, 78.3182]
    },
    riskLevel: "High",
    reason: "Fresh tension cracks observed on upslope retaining wall following sustained rain.",
    deadline: "2026-11-10T14:00:00Z",
    status: "Assigned",
    startedAt: null,
    completedAt: null,
    notes: null,
    escalation: null
  },
  {
    id: "TSK-402",
    assignedOfficerId: "OFF-2026-094",
    location: {
      name: "Village Approach Road B-12 (Chainage 3+400)",
      coordinates: [30.1588, 78.3341]
    },
    riskLevel: "Critical",
    reason: "Culvert washout reported by local sarpanch; risk of roadway subsidence.",
    deadline: "2026-11-10T09:30:00Z",
    status: "In_Progress",
    startedAt: "2026-11-09T18:15:00Z",
    completedAt: null,
    notes: null,
    escalation: null
  },
  {
    id: "TSK-403",
    assignedOfficerId: "OFF-2026-094",
    location: {
      name: "SH-6 Km 14+800 (Riverside Embankment)",
      coordinates: [30.1672, 78.3098]
    },
    riskLevel: "Moderate",
    reason: "Soil erosion along embankment toe noticed during routine patrol.",
    deadline: "2026-11-11T17:00:00Z",
    status: "Assigned",
    startedAt: null,
    completedAt: null,
    notes: null,
    escalation: null
  },
  {
    id: "TSK-404",
    assignedOfficerId: "OFF-2026-094",
    location: {
      name: "NH-58 Km 46+600 (Slide Debris Zone)",
      coordinates: [30.1510, 78.3255]
    },
    riskLevel: "Low",
    reason: "Post-clearance verification of old slide debris; road shoulder drainage check.",
    deadline: "2026-11-12T12:00:00Z",
    status: "Completed",
    startedAt: "2026-11-08T09:00:00Z",
    completedAt: "2026-11-08T14:30:00Z",
    notes: "Debris fully cleared. Drainage channel restored to full capacity. No further action required.",
    escalation: null
  }
];

let villagerReports = [
  {
    id: "REP-1082",
    assignedArea: "Sector 4 - Hill Highway Corridors",
    villagerName: "Ramesh Sharma",
    contact: "+91 94123 11223",
    timestamp: "2026-11-09T17:40:00Z",
    coordinates: [30.1451, 78.3204],
    locationDescription: "Near Shivalik bend, loose boulders rolling down slope",
    hazardType: "Rockfall / Minor Debris",
    photoUrl: "https://images.terra360.org/reports/rep_1082_rockfall.jpg",
    status: "Pending",
    fieldNotes: null,
    inspectorPhotoUrl: null,
    rejectionReason: null,
    escalatedAt: null
  },
  {
    id: "REP-1083",
    assignedArea: "Sector 4 - Hill Highway Corridors",
    villagerName: "Sunita Devi",
    contact: "+91 94123 55678",
    timestamp: "2026-11-09T14:20:00Z",
    coordinates: [30.1530, 78.3290],
    locationDescription: "Agricultural terrace above B-12 road, visible ground crack widening after last night rain",
    hazardType: "Slope Fissure / Ground Crack",
    photoUrl: "https://images.terra360.org/reports/rep_1083_crack.jpg",
    status: "Pending",
    fieldNotes: null,
    inspectorPhotoUrl: null,
    rejectionReason: null,
    escalatedAt: null
  },
  {
    id: "REP-1079",
    assignedArea: "Sector 4 - Hill Highway Corridors",
    villagerName: "Mohan Lal Thakur",
    contact: "+91 98765 22110",
    timestamp: "2026-11-08T10:15:00Z",
    coordinates: [30.1680, 78.3105],
    locationDescription: "Stream culvert near village school overflow, water pooling on road surface",
    hazardType: "Blocked Culvert / Waterlogging",
    photoUrl: "https://images.terra360.org/reports/rep_1079_culvert.jpg",
    status: "Verified",
    fieldNotes: "Inspected on site. Culvert inlet choked with debris and silt. Maintenance team notified for clearance.",
    inspectorPhotoUrl: "https://images.terra360.org/inspector/rep_1079_verified.jpg",
    rejectionReason: null,
    escalatedAt: null
  }
];

let roadConditions = [
  {
    roadSegmentId: "SEG-NH58-42",
    stretchName: "NH-58 Km 41 - 44 (Ridge Sector)",
    assignedArea: "Sector 4 - Hill Highway Corridors",
    condition: "Caution",
    reason: "Minor rock fragments cleared; wet mud on shoulder",
    photoUrl: "https://images.terra360.org/roads/seg_nh58_42.jpg",
    lastUpdatedBy: "OFF-2026-094",
    timestamp: "2026-11-09T16:00:00Z"
  },
  {
    roadSegmentId: "SEG-NH58-46",
    stretchName: "NH-58 Km 44 - 48 (Valley Descent)",
    assignedArea: "Sector 4 - Hill Highway Corridors",
    condition: "Open",
    reason: "Road surface clear; normal traffic flow",
    photoUrl: null,
    lastUpdatedBy: "OFF-2026-094",
    timestamp: "2026-11-09T12:00:00Z"
  },
  {
    roadSegmentId: "SEG-SH6-14",
    stretchName: "SH-6 Km 12 - 16 (Riverside Stretch)",
    assignedArea: "Sector 4 - Hill Highway Corridors",
    condition: "Partially Blocked",
    reason: "Single lane operation — minor landslide debris on outer lane, earthmover deployed",
    photoUrl: "https://images.terra360.org/roads/seg_sh6_14.jpg",
    lastUpdatedBy: "OFF-2026-094",
    timestamp: "2026-11-09T15:30:00Z"
  }
];

let sectorAlerts = [
  {
    id: "ALT-881",
    assignedArea: "Sector 4 - Hill Highway Corridors",
    severity: "Critical",
    title: "High Landslide Hazard Warning (Red Bulletin)",
    instructions: "Evacuate high-slope shoulder parking, close heavy vehicle transit through Chainage 42-45, inspect slope sensors every 2 hours.",
    createdAt: "2026-11-09T16:30:00Z",
    acknowledged: false,
    acknowledgedAt: null,
    acknowledgedBy: null
  },
  {
    id: "ALT-882",
    assignedArea: "Sector 4 - Hill Highway Corridors",
    severity: "Warning",
    title: "Heavy Rainfall Threshold Exceeded (>120mm/24h)",
    instructions: "Conduct foot reconnaissance of weep holes along highway retaining walls between Km 42 and Km 46. Report any hydrostatic pressure bulging.",
    createdAt: "2026-11-09T12:00:00Z",
    acknowledged: true,
    acknowledgedAt: "2026-11-09T12:45:00Z",
    acknowledgedBy: "OFF-2026-094"
  },
  {
    id: "ALT-883",
    assignedArea: "Sector 4 - Hill Highway Corridors",
    severity: "Advisory",
    title: "Night Travel Advisory: Dense Fog & Wet Road Slippage",
    instructions: "Ensure emergency beacon lights operational at Km 44 curve checkpoint. Advise passenger vehicles to slow below 25 km/h.",
    createdAt: "2026-11-08T20:00:00Z",
    acknowledged: true,
    acknowledgedAt: "2026-11-08T20:30:00Z",
    acknowledgedBy: "OFF-2026-094"
  }
];

// Dashboard sync log
let dashboardSyncLog = [];

// Seed Clones for test state isolation
const SEED_PROFILE = JSON.parse(JSON.stringify(officerProfile));
const SEED_TASKS = JSON.parse(JSON.stringify(tasks));
const SEED_REPORTS = JSON.parse(JSON.stringify(villagerReports));
const SEED_ROADS = JSON.parse(JSON.stringify(roadConditions));
const SEED_ALERTS = JSON.parse(JSON.stringify(sectorAlerts));

// ── Validation Constants ────────────────────────────────────────────────────

const VALID_CONDITIONS = ["Open", "Caution", "Partially Blocked", "Blocked"];
const VALID_LANGUAGES = ["EN", "HI", "MR", "NE", "BN", "TA"];

// ── Helper: sync notification hook to central dashboard ─────────────────────

const syncToDisasterOfficerDashboard = (eventPayload) => {
  dashboardSyncLog.push({
    ...eventPayload,
    dispatchedAt: new Date().toISOString()
  });
  // In production, emit via WebSocket, message broker, or central DB event stream
  console.log(`[DISASTER OFFICER SYNC EVENT] [${new Date().toISOString()}]:`, JSON.stringify(eventPayload, null, 2));
};

// ══════════════════════════════════════════════════════════════════════════════
// A. Profile Endpoints
// ══════════════════════════════════════════════════════════════════════════════

const getOfficerProfile = async (req, res) => {
  return res.status(200).json({ success: true, data: officerProfile });
};

const updateOfficerLanguage = async (req, res) => {
  const { language } = req.body;

  if (!language || !VALID_LANGUAGES.includes(language.toUpperCase())) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: `Invalid language code. Allowed values: ${VALID_LANGUAGES.join(", ")}`,
      fields: { language: [`Must be one of: ${VALID_LANGUAGES.join(", ")}`] }
    });
  }

  officerProfile.language = language.toUpperCase();
  return res.status(200).json({
    success: true,
    message: "Preferred language updated successfully",
    data: { language: officerProfile.language }
  });
};

// ══════════════════════════════════════════════════════════════════════════════
// B. Tasks Endpoints
// ══════════════════════════════════════════════════════════════════════════════

const getMyTasks = async (req, res) => {
  const officerTasks = tasks.filter((t) => t.assignedOfficerId === officerProfile.id);
  return res.status(200).json({ success: true, count: officerTasks.length, data: officerTasks });
};

const startTask = async (req, res) => {
  const { id } = req.params;
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return res.status(404).json({ success: false, code: "NOT_FOUND", message: `Task ${id} not found.` });
  }

  if (task.status === "Completed") {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Completed tasks cannot be restarted.",
      fields: { status: ["Task has already been completed."] }
    });
  }

  if (task.status === "Escalated") {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Escalated tasks cannot be started. Contact central command.",
      fields: { status: ["Task has been escalated to high command."] }
    });
  }

  task.status = "In_Progress";
  task.startedAt = new Date().toISOString();

  return res.status(200).json({
    success: true,
    message: `Task ${id} marked as In_Progress.`,
    data: task
  });
};

const completeTask = async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return res.status(404).json({ success: false, code: "NOT_FOUND", message: `Task ${id} not found.` });
  }

  if (task.status === "Completed") {
    return res.status(200).json({
      success: true,
      message: `Task ${id} is already completed.`,
      data: task
    });
  }

  task.status = "Completed";
  task.completedAt = new Date().toISOString();
  task.notes = notes || "Task inspection completed without exceptions.";

  syncToDisasterOfficerDashboard({
    type: "TASK_COMPLETED",
    taskId: task.id,
    officerId: officerProfile.id,
    location: task.location.name,
    completedAt: task.completedAt
  });

  return res.status(200).json({
    success: true,
    message: `Task ${id} completed successfully.`,
    data: task
  });
};

const escalateTask = async (req, res) => {
  const { id } = req.params;
  const { reason, priority = "High" } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Escalation reason is required.",
      fields: { reason: ["Escalation reason must be provided to notify disaster high command."] }
    });
  }

  const task = tasks.find((t) => t.id === id);
  if (!task) {
    return res.status(404).json({ success: false, code: "NOT_FOUND", message: `Task ${id} not found.` });
  }

  task.status = "Escalated";
  task.escalation = {
    reason: reason.trim(),
    priority,
    escalatedAt: new Date().toISOString(),
    escalatedBy: officerProfile.id
  };

  const notification = {
    type: "TASK_ESCALATED",
    notificationId: `NOTIF-ESC-${Date.now()}`,
    taskId: task.id,
    location: task.location.name,
    coordinates: task.location.coordinates,
    escalatedBy: officerProfile.name,
    priority,
    reason: reason.trim(),
    ackRequired: true,
    status: "DISPATCHED_TO_HIGH_COMMAND"
  };

  syncToDisasterOfficerDashboard(notification);

  return res.status(200).json({
    success: true,
    message: `Task ${id} escalated to central dashboard.`,
    data: { task, dashboardDispatch: notification }
  });
};

// ══════════════════════════════════════════════════════════════════════════════
// C. Map Endpoints
// ══════════════════════════════════════════════════════════════════════════════

const getAssignedMapData = async (req, res) => {
  const mapData = {
    sector: officerProfile.assignedArea,
    sectorCenter: [30.1550, 78.3220],
    zoomLevel: 13,

    // GeoJSON boundaries for assigned villages and road stretches
    villages: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { id: "VIL-01", name: "Rampur Upper", population: 2400, evacuationZone: "School Grounds" },
          geometry: {
            type: "Polygon",
            coordinates: [[[78.310, 30.155], [78.320, 30.155], [78.320, 30.165], [78.310, 30.165], [78.310, 30.155]]]
          }
        },
        {
          type: "Feature",
          properties: { id: "VIL-02", name: "Devipura", population: 1800, evacuationZone: "Community Hall" },
          geometry: {
            type: "Polygon",
            coordinates: [[[78.325, 30.148], [78.340, 30.148], [78.340, 30.158], [78.325, 30.158], [78.325, 30.148]]]
          }
        },
        {
          type: "Feature",
          properties: { id: "VIL-03", name: "Joshimath Lower", population: 3100, evacuationZone: "Temple Complex" },
          geometry: {
            type: "Polygon",
            coordinates: [[[78.300, 30.140], [78.315, 30.140], [78.315, 30.152], [78.300, 30.152], [78.300, 30.140]]]
          }
        }
      ]
    },

    // Road stretches
    roadStretches: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "NH-58 Km 40-48 (Ridge to Valley)", highwayCode: "NH-58", totalLengthKm: 8 },
          geometry: {
            type: "LineString",
            coordinates: [[78.310, 30.170], [78.315, 30.160], [78.320, 30.150], [78.325, 30.142], [78.330, 30.138]]
          }
        },
        {
          type: "Feature",
          properties: { name: "SH-6 Km 12-16 (Riverside)", highwayCode: "SH-6", totalLengthKm: 4 },
          geometry: {
            type: "LineString",
            coordinates: [[78.305, 30.165], [78.308, 30.168], [78.312, 30.170], [78.316, 30.172]]
          }
        }
      ]
    },

    // High-risk landslide / disaster danger zones with risk weightings
    dangerZones: [
      {
        zoneId: "DZ-01",
        name: "NH-58 Km 42 Active Escarpment",
        coordinates: [30.1425, 78.3182],
        riskWeight: 0.92,
        landslideSusceptibility: "Critical",
        slopeAngleDeg: 48,
        soilMoisturePercent: 87,
        recentRainfall24hMm: 115,
        radiusMeters: 400,
        status: "Active Creep Detected"
      },
      {
        zoneId: "DZ-02",
        name: "SH-6 Riverside Embankment Undercut",
        coordinates: [30.1672, 78.3098],
        riskWeight: 0.71,
        landslideSusceptibility: "High",
        slopeAngleDeg: 34,
        soilMoisturePercent: 79,
        recentRainfall24hMm: 92,
        radiusMeters: 250,
        status: "Under Observation"
      },
      {
        zoneId: "DZ-03",
        name: "Devipura Upper Terrace Slip Zone",
        coordinates: [30.1530, 78.3310],
        riskWeight: 0.65,
        landslideSusceptibility: "Moderate",
        slopeAngleDeg: 30,
        soilMoisturePercent: 68,
        recentRainfall24hMm: 78,
        radiusMeters: 180,
        status: "Stable (Monitoring)"
      }
    ],

    // Active villager hazard report markers with coordinates
    hazardReportMarkers: villagerReports
      .filter((r) => r.status !== "Rejected")
      .map((r) => ({
        reportId: r.id,
        villagerName: r.villagerName,
        coordinates: r.coordinates,
        hazardType: r.hazardType,
        status: r.status,
        locationDescription: r.locationDescription,
        timestamp: r.timestamp
      })),

    // Navigation route coordinate endpoints for active tasks
    navigationRoutes: tasks
      .filter((t) => t.status === "Assigned" || t.status === "In_Progress")
      .map((t) => ({
        taskId: t.id,
        targetLocation: t.location.name,
        origin: { name: "Field Officer Post (Sector 4 HQ)", coordinates: [30.1500, 78.3100] },
        destination: { name: t.location.name, coordinates: t.location.coordinates },
        riskLevel: t.riskLevel,
        estimatedTravelTimeMin: Math.floor(Math.random() * 20) + 10
      }))
  };

  return res.status(200).json({ success: true, data: mapData });
};

// ══════════════════════════════════════════════════════════════════════════════
// D. Villager Reports Endpoints
// ══════════════════════════════════════════════════════════════════════════════

const getReports = async (req, res) => {
  const { status, hazardType } = req.query || {};
  let result = villagerReports.filter((r) => r.assignedArea === officerProfile.assignedArea);

  if (status) {
    result = result.filter((r) => r.status.toLowerCase() === String(status).toLowerCase());
  }
  if (hazardType) {
    result = result.filter((r) => r.hazardType.toLowerCase().includes(String(hazardType).toLowerCase()));
  }

  return res.status(200).json({ success: true, count: result.length, data: result });
};

const verifyReport = async (req, res) => {
  const { id } = req.params;
  const { fieldNotes, inspectorPhotoUrl } = req.body || {};

  const report = villagerReports.find((r) => r.id === id);
  if (!report) {
    return res.status(404).json({ success: false, code: "NOT_FOUND", message: `Report ${id} not found.` });
  }

  if (report.assignedArea !== officerProfile.assignedArea) {
    return res.status(403).json({
      success: false,
      code: "FORBIDDEN_SECTOR_ACCESS",
      message: "Cannot verify a report from outside your assigned sector."
    });
  }

  if (report.status === "Verified") {
    return res.status(200).json({ success: true, message: `Report ${id} is already verified.`, data: report });
  }

  report.status = "Verified";
  report.fieldNotes = fieldNotes || "Ground truth confirmed by field officer inspection.";
  if (inspectorPhotoUrl) {
    report.inspectorPhotoUrl = inspectorPhotoUrl;
  }

  return res.status(200).json({
    success: true,
    message: `Report ${id} marked as Verified. Ground truth confirmed.`,
    data: report
  });
};

const rejectReport = async (req, res) => {
  const { id } = req.params;
  const { rejectionReason } = req.body || {};

  if (!rejectionReason || !rejectionReason.trim()) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Rejection reason is required.",
      fields: { rejectionReason: ["A mandatory reason must be provided when rejecting a villager report."] }
    });
  }

  const report = villagerReports.find((r) => r.id === id);
  if (!report) {
    return res.status(404).json({ success: false, code: "NOT_FOUND", message: `Report ${id} not found.` });
  }

  if (report.assignedArea !== officerProfile.assignedArea) {
    return res.status(403).json({
      success: false,
      code: "FORBIDDEN_SECTOR_ACCESS",
      message: "Cannot reject a report from outside your assigned sector."
    });
  }

  report.status = "Rejected";
  report.rejectionReason = rejectionReason.trim();

  return res.status(200).json({
    success: true,
    message: `Report ${id} marked as Rejected. Reason documented.`,
    data: report
  });
};

const escalateReport = async (req, res) => {
  const { id } = req.params;
  const { escalationReason, urgency = "Immediate", recommendedAction } = req.body || {};

  if (!escalationReason || !escalationReason.trim()) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Escalation reason is required.",
      fields: { escalationReason: ["Escalation reason must be provided to alert disaster high command."] }
    });
  }

  const report = villagerReports.find((r) => r.id === id);
  if (!report) {
    return res.status(404).json({ success: false, code: "NOT_FOUND", message: `Report ${id} not found.` });
  }

  if (report.assignedArea !== officerProfile.assignedArea) {
    return res.status(403).json({
      success: false,
      code: "FORBIDDEN_SECTOR_ACCESS",
      message: "Cannot escalate a report from outside your assigned sector."
    });
  }

  const validUrgencies = ["Immediate", "High", "Critical"];
  const chosenUrgency = validUrgencies.includes(urgency) ? urgency : "Immediate";

  report.status = "Escalated";
  report.escalatedAt = new Date().toISOString();

  const commandDispatch = {
    type: "REPORT_ESCALATED",
    dispatchId: `DISP-REP-${Date.now()}`,
    reportId: report.id,
    urgency: chosenUrgency,
    hazardType: report.hazardType,
    locationDescription: report.locationDescription,
    coordinates: report.coordinates,
    escalatedBy: officerProfile.name,
    escalationReason: escalationReason.trim(),
    recommendedAction: recommendedAction || "Deploy emergency intervention team and conduct immediate assessment.",
    ackRequired: true,
    status: "DISPATCHED_TO_HIGH_COMMAND"
  };

  syncToDisasterOfficerDashboard(commandDispatch);

  return res.status(200).json({
    success: true,
    message: `Report ${id} escalated to high command with urgency '${chosenUrgency}'.`,
    data: { report, commandDispatch }
  });
};

// ══════════════════════════════════════════════════════════════════════════════
// E. Road Status Endpoints
// ══════════════════════════════════════════════════════════════════════════════

const getCurrentRoadStatus = async (req, res) => {
  const sectorRoads = roadConditions.filter((r) => r.assignedArea === officerProfile.assignedArea);
  return res.status(200).json({
    success: true,
    sector: officerProfile.assignedArea,
    count: sectorRoads.length,
    data: sectorRoads
  });
};

const updateRoadStatus = async (req, res) => {
  const { roadSegmentId, stretchName, condition, reason, photoUrl, timestamp } = req.body || {};

  // Validate required fields
  const errors = {};

  if (!roadSegmentId && !stretchName) {
    errors.roadSegmentId = ["Either roadSegmentId or stretchName must be provided."];
  }

  if (!condition) {
    errors.condition = [`Condition is required. Must be one of: ${VALID_CONDITIONS.join(", ")}`];
  } else if (!VALID_CONDITIONS.includes(condition)) {
    errors.condition = [`Invalid condition '${condition}'. Allowed values: ${VALID_CONDITIONS.join(", ")}`];
  }

  if (!reason || typeof reason !== "string" || !reason.trim()) {
    errors.reason = ["Reason describing obstruction or road status is required."];
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Road status update validation failed.",
      fields: errors
    });
  }

  const updateTimestamp = timestamp && !isNaN(Date.parse(timestamp))
    ? new Date(timestamp).toISOString()
    : new Date().toISOString();

  // Find existing segment or create new one
  let segment = roadConditions.find(
    (r) =>
      (roadSegmentId && r.roadSegmentId === roadSegmentId) ||
      (stretchName && r.stretchName.toLowerCase().includes(stretchName.toLowerCase()))
  );

  if (!segment) {
    segment = {
      roadSegmentId: roadSegmentId || `SEG-CUSTOM-${Date.now()}`,
      stretchName: stretchName || "Assigned Road Stretch",
      assignedArea: officerProfile.assignedArea,
      condition,
      reason: reason.trim(),
      photoUrl: photoUrl || null,
      lastUpdatedBy: officerProfile.id,
      timestamp: updateTimestamp
    };
    roadConditions.push(segment);
  } else {
    segment.condition = condition;
    segment.reason = reason.trim();
    if (photoUrl !== undefined) segment.photoUrl = photoUrl;
    segment.lastUpdatedBy = officerProfile.id;
    segment.timestamp = updateTimestamp;
  }

  // Business Rule: Immediately sync to central disaster officer dashboard
  const dashboardSync = {
    type: "ROAD_STATUS_REALTIME_UPDATE",
    syncId: `SYNC-ROAD-${Date.now()}`,
    roadSegmentId: segment.roadSegmentId,
    stretchName: segment.stretchName,
    condition: segment.condition,
    reason: segment.reason,
    photoUrl: segment.photoUrl,
    updatedBy: officerProfile.name,
    sector: segment.assignedArea,
    routeAlertsUpdated: true,
    publicBroadcastNotice: `Transit Alert: ${segment.stretchName} condition changed to '${segment.condition}' — ${segment.reason}`
  };

  syncToDisasterOfficerDashboard(dashboardSync);

  return res.status(200).json({
    success: true,
    message: `Road status for '${segment.stretchName}' updated to '${condition}' and synchronized to central dashboard.`,
    data: { roadStatus: segment, dashboardSync }
  });
};

// ══════════════════════════════════════════════════════════════════════════════
// F. Sector Alerts Endpoints
// ══════════════════════════════════════════════════════════════════════════════

const getAlerts = async (req, res) => {
  const alerts = sectorAlerts.filter((a) => a.assignedArea === officerProfile.assignedArea);
  return res.status(200).json({
    success: true,
    sector: officerProfile.assignedArea,
    count: alerts.length,
    data: alerts
  });
};

const acknowledgeAlert = async (req, res) => {
  const { id } = req.params;

  const alert = sectorAlerts.find((a) => a.id === id);
  if (!alert) {
    return res.status(404).json({ success: false, code: "NOT_FOUND", message: `Alert ${id} not found.` });
  }

  if (alert.assignedArea !== officerProfile.assignedArea) {
    return res.status(403).json({
      success: false,
      code: "FORBIDDEN_SECTOR_ACCESS",
      message: "Cannot acknowledge an alert outside your designated sector."
    });
  }

  if (alert.acknowledged) {
    return res.status(200).json({
      success: true,
      message: `Alert ${id} was already acknowledged.`,
      data: alert
    });
  }

  alert.acknowledged = true;
  alert.acknowledgedAt = new Date().toISOString();
  alert.acknowledgedBy = officerProfile.id;

  return res.status(200).json({
    success: true,
    message: `Alert ${id} successfully acknowledged by Officer '${officerProfile.name}'.`,
    data: alert
  });
};

// ══════════════════════════════════════════════════════════════════════════════
// Utility: Reset state (for testing)
// ══════════════════════════════════════════════════════════════════════════════

const resetState = () => {
  officerProfile = JSON.parse(JSON.stringify(SEED_PROFILE));
  tasks = JSON.parse(JSON.stringify(SEED_TASKS));
  villagerReports = JSON.parse(JSON.stringify(SEED_REPORTS));
  roadConditions = JSON.parse(JSON.stringify(SEED_ROADS));
  sectorAlerts = JSON.parse(JSON.stringify(SEED_ALERTS));
  dashboardSyncLog = [];
};

// ══════════════════════════════════════════════════════════════════════════════
// Module Exports
// ══════════════════════════════════════════════════════════════════════════════

const controllerObj = {
  // Profile
  getProfile: getOfficerProfile,
  getOfficerProfile,
  updateLanguage: updateOfficerLanguage,
  updateOfficerLanguage,
  // Tasks
  getTasks: getMyTasks,
  getMyTasks,
  startTask,
  completeTask,
  escalateTask,
  // Map
  getMapData: getAssignedMapData,
  getAssignedMapData,
  // Reports
  getReports,
  verifyReport,
  rejectReport,
  escalateReport,
  // Road Status
  getCurrentRoadStatus,
  updateRoadStatus,
  // Alerts
  getAlerts,
  acknowledgeAlert,
  // Utility
  resetState,
};

module.exports = {
  ...controllerObj,
  fieldOfficerController: controllerObj,
  // Constants
  VALID_CONDITIONS,
  VALID_LANGUAGES,
  VALID_TASK_RISK: ["Low", "Moderate", "High", "Critical"],
  VALID_REPORT_STATUS: ["Pending", "Verified", "Rejected", "Escalated"],
  VALID_SEVERITIES: ["Advisory", "Warning", "Critical"],
};
