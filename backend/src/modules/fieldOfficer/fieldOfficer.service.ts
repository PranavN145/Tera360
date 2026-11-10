/**
 * Terra360 Field Officer Portal Service
 * Business logic, status state-machine transitions, and central dispatch
 */

import {
  FieldOfficerProfile,
  FieldOfficerTask,
  VillagerReportItem,
  RoadStatusSegment,
  SectorAlertItem,
  INITIAL_OFFICER_PROFILE,
  INITIAL_TASKS,
  INITIAL_REPORTS,
  INITIAL_ROAD_STATUSES,
  INITIAL_ALERTS,
  RoadCondition,
} from './fieldOfficer.mockData';

export class FieldOfficerServiceError extends Error {
  statusCode: number;
  code: string;
  fields?: Record<string, string[]>;

  constructor(message: string, code = 'ERROR', statusCode = 400, fields?: Record<string, string[]>) {
    super(message);
    this.name = 'FieldOfficerServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.fields = fields;
  }
}

export class FieldOfficerService {
  private profile: FieldOfficerProfile = { ...INITIAL_OFFICER_PROFILE };
  private tasks: FieldOfficerTask[] = JSON.parse(JSON.stringify(INITIAL_TASKS));
  private reports: VillagerReportItem[] = JSON.parse(JSON.stringify(INITIAL_REPORTS));
  private roadStatuses: RoadStatusSegment[] = JSON.parse(JSON.stringify(INITIAL_ROAD_STATUSES));
  private alerts: SectorAlertItem[] = JSON.parse(JSON.stringify(INITIAL_ALERTS));
  private dashboardDispatches: any[] = [];

  // ── Profile ───────────────────────────────────────────────────────────────

  getProfile(officerId?: string, sectorOverride?: string): FieldOfficerProfile {
    return {
      ...this.profile,
      id: officerId || this.profile.id,
      assignedArea: sectorOverride || this.profile.assignedArea,
    };
  }

  updateLanguage(language: string): FieldOfficerProfile {
    this.profile.language = language.trim().toLowerCase();
    return this.profile;
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────

  getTasks(sector: string, filterStatus?: string, filterRisk?: string): FieldOfficerTask[] {
    let list = this.tasks.filter((t) => t.sector === sector);

    if (filterStatus) {
      list = list.filter((t) => t.status.toLowerCase() === filterStatus.toLowerCase());
    }

    if (filterRisk) {
      list = list.filter((t) => t.riskLevel.toLowerCase() === filterRisk.toLowerCase());
    }

    return list;
  }

  startTask(taskId: string, sector: string): FieldOfficerTask {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new FieldOfficerServiceError(`Inspection Task '${taskId}' not found`, 'NOT_FOUND', 404);
    }

    if (task.sector !== sector) {
      throw new FieldOfficerServiceError('Access forbidden: Task belongs to another sector jurisdiction', 'FORBIDDEN_SECTOR_ACCESS', 403);
    }

    if (task.status === 'Completed') {
      throw new FieldOfficerServiceError('Task has already been completed and cannot be restarted.', 'VALIDATION_ERROR', 400, {
        status: ['Task has already been completed and cannot be restarted.'],
      });
    }

    task.status = 'In_Progress';
    task.startedAt = new Date().toISOString();
    return task;
  }

  completeTask(taskId: string, sector: string, completionNotes?: string): FieldOfficerTask {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new FieldOfficerServiceError(`Inspection Task '${taskId}' not found`, 'NOT_FOUND', 404);
    }

    if (task.sector !== sector) {
      throw new FieldOfficerServiceError('Access forbidden: Task belongs to another sector jurisdiction', 'FORBIDDEN_SECTOR_ACCESS', 403);
    }

    task.status = 'Completed';
    task.completedAt = new Date().toISOString();
    task.completionNotes = completionNotes || 'Inspection concluded successfully; conditions stabilized.';
    return task;
  }

  escalateTask(taskId: string, sector: string, reason: string, priority = 'Critical', officerName = 'Officer') {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new FieldOfficerServiceError(`Inspection Task '${taskId}' not found`, 'NOT_FOUND', 404);
    }

    if (task.sector !== sector) {
      throw new FieldOfficerServiceError('Access forbidden: Task belongs to another sector jurisdiction', 'FORBIDDEN_SECTOR_ACCESS', 403);
    }

    const timestamp = new Date().toISOString();
    task.status = 'Escalated';
    task.escalatedAt = timestamp;
    task.escalationReason = reason.trim();
    task.escalationPriority = priority;

    const dispatch = {
      notificationId: `NOTIF-ESC-${Date.now()}`,
      channel: 'CENTRAL_DISASTER_DASHBOARD',
      taskId: task.id,
      location: task.location.chainageName,
      coordinates: task.location.coordinates,
      escalatedBy: officerName,
      priority,
      reason: task.escalationReason,
      dispatchedAt: timestamp,
      ackRequired: true,
      status: 'DISPATCHED_TO_HIGH_COMMAND',
    };

    this.dashboardDispatches.push(dispatch);

    return {
      task,
      dashboardDispatch: dispatch,
    };
  }

  // ── Map Data ──────────────────────────────────────────────────────────────

  getMapData(sector: string) {
    const boundariesGeoJson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            name: 'Phesama Village Territory',
            category: 'village',
            population: 3200,
            evacuationZone: 'Upper School Grounds',
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [94.035, 25.658],
                [94.045, 25.659],
                [94.048, 25.669],
                [94.038, 25.672],
                [94.035, 25.658],
              ],
            ],
          },
        },
        {
          type: 'Feature',
          properties: {
            name: 'Dzüdza Village & River Corridor',
            category: 'village',
            population: 1850,
            evacuationZone: 'Dzüdza Community Hall',
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [94.020, 25.679],
                [94.030, 25.681],
                [94.032, 25.692],
                [94.021, 25.691],
                [94.020, 25.679],
              ],
            ],
          },
        },
        {
          type: 'Feature',
          properties: {
            name: 'NH-29 Monitored Corridor Stretch (KM 38 to KM 52)',
            category: 'road_corridor',
            highwayCode: 'NH-29',
            totalLengthKm: 14.0,
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [94.015, 25.700],
              [94.022, 25.689],
              [94.025, 25.685],
              [94.031, 25.677],
              [94.037, 25.668],
              [94.041, 25.662],
              [94.047, 25.655],
            ],
          },
        },
      ],
    };

    const dangerZones = [
      {
        zoneId: 'DZ-SEC4-01',
        name: 'Dzüdza Active Escarpment Slip',
        coordinates: [94.025, 25.685],
        riskWeight: 0.94,
        landslideSusceptibility: 'Critical',
        slopeAngleDeg: 46,
        soilMoisturePercent: 89,
        recentRainfall24hMm: 118,
        radiusMeters: 450,
        historicalIncidents: 4,
        status: 'Active Creep Detected',
      },
      {
        zoneId: 'DZ-SEC4-02',
        name: 'Phesama Upper Colluvium Slide',
        coordinates: [94.041, 25.662],
        riskWeight: 0.78,
        landslideSusceptibility: 'High',
        slopeAngleDeg: 38,
        soilMoisturePercent: 76,
        recentRainfall24hMm: 92,
        radiusMeters: 300,
        historicalIncidents: 2,
        status: 'Under Observation',
      },
    ];

    const activeHazardReports = this.reports
      .filter((r) => r.sector === sector && r.status !== 'Rejected')
      .map((r) => ({
        reportId: r.id,
        villagerName: r.villagerName,
        coordinates: r.coordinates,
        hazardType: r.hazardType,
        status: r.status,
        locationDescription: r.locationDescription,
        timestamp: r.timestamp,
        photoUrl: r.photoUrl,
      }));

    const activeTasks = this.tasks.filter(
      (t) => t.sector === sector && (t.status === 'Assigned' || t.status === 'In_Progress')
    );

    const origin = this.profile.postLocation.coordinates;
    const navigationRoutes = activeTasks.map((t) => ({
      taskId: t.id,
      targetLocation: t.location.chainageName,
      origin: {
        name: this.profile.postLocation.name,
        coordinates: origin,
      },
      destination: {
        name: t.location.chainageName,
        coordinates: t.location.coordinates,
      },
      distanceKm: 6.8,
      estimatedTravelTimeMin: 14,
      routeWaypoints: [
        origin,
        [(origin[0] + t.location.coordinates[0]) / 2, (origin[1] + t.location.coordinates[1]) / 2],
        t.location.coordinates,
      ],
    }));

    return {
      sector,
      sectorCenter: [94.028, 25.675],
      zoomLevel: 13,
      boundaries: boundariesGeoJson,
      dangerZones,
      hazardReports: activeHazardReports,
      navigationRoutes,
    };
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  getReports(sector: string, filterStatus?: string, filterHazard?: string): VillagerReportItem[] {
    let list = this.reports.filter((r) => r.sector === sector);

    if (filterStatus) {
      list = list.filter((r) => r.status.toLowerCase() === filterStatus.toLowerCase());
    }

    if (filterHazard) {
      list = list.filter((r) => r.hazardType.toLowerCase() === filterHazard.toLowerCase());
    }

    return list;
  }

  verifyReport(reportId: string, sector: string, fieldNotes?: string, inspectorPhotoUrl?: string, officerName = 'Officer') {
    const report = this.reports.find((r) => r.id === reportId);
    if (!report) {
      throw new FieldOfficerServiceError(`Villager Report '${reportId}' not found`, 'NOT_FOUND', 404);
    }

    if (report.sector !== sector) {
      throw new FieldOfficerServiceError('Access forbidden: Report belongs to another sector jurisdiction', 'FORBIDDEN_SECTOR_ACCESS', 403);
    }

    report.status = 'Verified';
    report.verifiedAt = new Date().toISOString();
    report.verifiedBy = officerName;
    report.fieldNotes = fieldNotes || 'Ground truth confirmed by field officer inspection.';
    if (inspectorPhotoUrl) {
      report.inspectorPhotoUrl = inspectorPhotoUrl;
    }

    return report;
  }

  rejectReport(reportId: string, sector: string, rejectionReason: string, officerName = 'Officer') {
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      throw new FieldOfficerServiceError('Rejection reason is mandatory', 'VALIDATION_ERROR', 400, {
        rejectionReason: ['Rejection reason is required.'],
      });
    }

    const report = this.reports.find((r) => r.id === reportId);
    if (!report) {
      throw new FieldOfficerServiceError(`Villager Report '${reportId}' not found`, 'NOT_FOUND', 404);
    }

    if (report.sector !== sector) {
      throw new FieldOfficerServiceError('Access forbidden: Report belongs to another sector jurisdiction', 'FORBIDDEN_SECTOR_ACCESS', 403);
    }

    report.status = 'Rejected';
    report.rejectedAt = new Date().toISOString();
    report.rejectedBy = officerName;
    report.rejectionReason = rejectionReason.trim();

    return report;
  }

  escalateReport(
    reportId: string,
    sector: string,
    escalationReason: string,
    urgency: 'Immediate' | 'High' | 'Critical' = 'Immediate',
    recommendedAction?: string,
    officerName = 'Officer'
  ) {
    if (!escalationReason || escalationReason.trim().length === 0) {
      throw new FieldOfficerServiceError('Escalation reason is required', 'VALIDATION_ERROR', 400, {
        escalationReason: ['Escalation reason is required.'],
      });
    }

    const report = this.reports.find((r) => r.id === reportId);
    if (!report) {
      throw new FieldOfficerServiceError(`Villager Report '${reportId}' not found`, 'NOT_FOUND', 404);
    }

    if (report.sector !== sector) {
      throw new FieldOfficerServiceError('Access forbidden: Report belongs to another sector jurisdiction', 'FORBIDDEN_SECTOR_ACCESS', 403);
    }

    const timestamp = new Date().toISOString();
    report.status = 'Escalated';
    report.escalationMetadata = {
      urgency,
      escalationReason: escalationReason.trim(),
      recommendedAction: recommendedAction || 'Deploy emergency SDRF/NDRF team for preventive slope containment.',
      escalatedBy: officerName,
      escalatedAt: timestamp,
    };

    const commandDispatch = {
      dispatchId: `DISP-REP-${Date.now()}`,
      reportId: report.id,
      urgency,
      hazardType: report.hazardType,
      locationDescription: report.locationDescription,
      coordinates: report.coordinates,
      officer: officerName,
      action: report.escalationMetadata.recommendedAction,
      timestamp,
    };
    this.dashboardDispatches.push(commandDispatch);

    return {
      report,
      commandDispatch,
    };
  }

  // ── Road Status ───────────────────────────────────────────────────────────

  getCurrentRoadStatus(sector: string): RoadStatusSegment[] {
    return this.roadStatuses.filter((r) => r.sector === sector);
  }

  updateRoadStatus(
    sector: string,
    roadSegmentId?: string,
    stretchName?: string,
    condition: RoadCondition = 'Open',
    reason = '',
    photoUrl?: string | null,
    timestamp?: string,
    officerName = 'Officer'
  ) {
    const updateTimestamp = timestamp || new Date().toISOString();

    let segment = this.roadStatuses.find(
      (r) =>
        (roadSegmentId && r.roadSegmentId === roadSegmentId) ||
        (stretchName && r.stretchName.toLowerCase().includes(stretchName.toLowerCase()))
    );

    if (!segment) {
      segment = {
        roadSegmentId: roadSegmentId || `ROAD-CUSTOM-${Date.now()}`,
        stretchName: stretchName || 'Assigned Road Stretch',
        condition,
        reason: reason.trim(),
        photoUrl: photoUrl || null,
        timestamp: updateTimestamp,
        updatedBy: officerName,
        sector,
      };
      this.roadStatuses.push(segment);
    } else {
      segment.condition = condition;
      segment.reason = reason.trim();
      if (photoUrl !== undefined) segment.photoUrl = photoUrl;
      segment.timestamp = updateTimestamp;
      segment.updatedBy = officerName;
    }

    const dashboardSyncPayload = {
      syncId: `SYNC-ROAD-${Date.now()}`,
      broadcastType: 'ROAD_STATUS_REALTIME_UPDATE',
      roadSegmentId: segment.roadSegmentId,
      stretchName: segment.stretchName,
      condition: segment.condition,
      reason: segment.reason,
      photoUrl: segment.photoUrl,
      updatedBy: segment.updatedBy,
      sector: segment.sector,
      timestamp: updateTimestamp,
      routeAlertsUpdated: true,
      publicBroadcastNotice: `Transit Alert: ${segment.stretchName} condition changed to '${segment.condition}' - ${segment.reason}`,
    };

    this.dashboardDispatches.push(dashboardSyncPayload);

    return {
      roadStatus: segment,
      dashboardSync: dashboardSyncPayload,
    };
  }

  // ── Alerts ────────────────────────────────────────────────────────────────

  getAlerts(sector: string): SectorAlertItem[] {
    return this.alerts.filter((a) => a.targetSector === sector);
  }

  acknowledgeAlert(alertId: string, sector: string, officerId: string) {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (!alert) {
      throw new FieldOfficerServiceError(`Sector Alert '${alertId}' not found`, 'NOT_FOUND', 404);
    }

    if (alert.targetSector !== sector) {
      throw new FieldOfficerServiceError('Access forbidden: Alert is outside your designated sector', 'FORBIDDEN_SECTOR_ACCESS', 403);
    }

    alert.acknowledged = true;
    alert.acknowledgedAt = new Date().toISOString();
    alert.acknowledgedBy = officerId;
    return alert;
  }

  // ── Testing Reset ─────────────────────────────────────────────────────────

  resetState() {
    this.profile = { ...INITIAL_OFFICER_PROFILE };
    this.tasks = JSON.parse(JSON.stringify(INITIAL_TASKS));
    this.reports = JSON.parse(JSON.stringify(INITIAL_REPORTS));
    this.roadStatuses = JSON.parse(JSON.stringify(INITIAL_ROAD_STATUSES));
    this.alerts = JSON.parse(JSON.stringify(INITIAL_ALERTS));
    this.dashboardDispatches = [];
  }
}

export const fieldOfficerService = new FieldOfficerService();

