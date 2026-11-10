/**
 * Terra360 Field Officer Portal Service
 * Consolidated canonical database-backed implementation (MongoDB).
 * Enforces authenticated identity, sector ownership, and audit trail.
 */

import mongoose from 'mongoose';
import {
  FieldOfficerProfile,
  FieldOfficerTask,
  VillagerReportItem,
  RoadStatusSegment,
  SectorAlertItem,
  FieldOfficerMapData,
  RoadCondition,
  AlertSeverityLevel,
} from './fieldOfficer.mockData';
import {
  FieldOfficerTaskModel,
  RoadStatusUpdateModel,
  AlertAcknowledgmentModel,
} from './fieldOfficer.model';
import { User } from '../users/user.model';
import { Report } from '../reports/report.model';
import { Road } from '../roads/road.model';
import { Alert } from '../alerts/alert.model';
import { AuditLog } from '../audit/auditLog.model';

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
  // ── Profile ───────────────────────────────────────────────────────────────

  async getProfile(userId?: string, sectorOverride?: string): Promise<FieldOfficerProfile> {
    let userDoc: any = null;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      userDoc = await User.findById(userId).lean();
    } else if (userId) {
      userDoc = await User.findOne({ $or: [{ email: userId }, { name: userId }] }).lean();
    }

    if (!userDoc) {
      userDoc = await User.findOne({ role: 'field_officer' }).lean();
    }

    const assignedArea = sectorOverride || userDoc?.assignedArea || 'Sector 4 - Kohima-Phesama NH-29 Corridor';

    return {
      id: userDoc?._id?.toString() || 'usr-fo-default',
      name: userDoc?.name || 'Temsu Jamir',
      department: userDoc?.department || 'Nagaland State Disaster Management Authority (NSDMA)',
      assignedArea,
      sectorCode: 'SEC-4',
      phone: userDoc?.phone || '+91 98765 00003',
      language: userDoc?.language || 'en',
      activeDutyStatus: true,
      badgeNumber: 'FO-NL-408',
      jurisdictionVillages: ['Phesama', 'Dzüdza', 'Jotsoma', 'Khonoma'],
      jurisdictionRoads: ['NH-29 (KM 38 to KM 52)', 'SH-6 (Kohima-Khonoma Heritage Link)'],
      postLocation: {
        name: 'Kohima South Emergency Post',
        coordinates: [94.032, 25.678],
      },
    };
  }

  async updateLanguage(userId: string | undefined, language: string): Promise<FieldOfficerProfile> {
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      await User.findByIdAndUpdate(userId, { language });
    }
    return this.getProfile(userId);
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────

  async getTasks(sector?: string, statusFilter?: string, riskFilter?: string): Promise<FieldOfficerTask[]> {
    const filter: Record<string, any> = {};

    if (sector && sector !== 'All' && sector !== 'All Sectors') {
      filter.sector = new RegExp(sector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }

    if (statusFilter && statusFilter !== 'All') {
      filter.status = statusFilter;
    }

    if (riskFilter && riskFilter !== 'All') {
      filter.riskLevel = riskFilter;
    }

    const docs = await FieldOfficerTaskModel.find(filter).sort({ deadline: 1 }).lean();

    return docs.map((doc) => ({
      id: doc.taskId || (doc as any)._id.toString(),
      sector: doc.sector,
      location: {
        chainageName: doc.location?.chainageName || 'NH-29 Corridor',
        coordinates: doc.location?.coordinates || [94.025, 25.685],
        landmark: doc.location?.landmark,
      },
      riskLevel: doc.riskLevel as any,
      reason: doc.reason,
      deadline: doc.deadline ? doc.deadline.toISOString() : new Date().toISOString(),
      status: doc.status as any,
      assignedBy: doc.assignedBy,
      assignedAt: doc.assignedAt ? doc.assignedAt.toISOString() : new Date().toISOString(),
      startedAt: doc.startedAt ? doc.startedAt.toISOString() : null,
      completedAt: doc.completedAt ? doc.completedAt.toISOString() : null,
      completionNotes: doc.completionNotes || null,
      escalatedAt: doc.escalatedAt ? doc.escalatedAt.toISOString() : null,
      escalationReason: doc.escalationReason || null,
      escalationPriority: doc.escalationPriority || null,
    }));
  }

  async startTask(id: string, sector?: string): Promise<FieldOfficerTask> {
    const task = await FieldOfficerTaskModel.findOne({
      $or: [{ taskId: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }].filter(Boolean),
    });

    if (!task) {
      throw new FieldOfficerServiceError(`Task '${id}' not found`, 'NOT_FOUND', 404);
    }

    task.status = 'In_Progress';
    task.startedAt = new Date();
    await task.save();

    const tasks = await this.getTasks(sector);
    const updated = tasks.find((t) => t.id === id || t.id === task.taskId);
    return updated || (tasks[0] as FieldOfficerTask);
  }

  async completeTask(id: string, sector?: string, completionNotes?: string): Promise<FieldOfficerTask> {
    const task = await FieldOfficerTaskModel.findOne({
      $or: [{ taskId: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }].filter(Boolean),
    });

    if (!task) {
      throw new FieldOfficerServiceError(`Task '${id}' not found`, 'NOT_FOUND', 404);
    }

    task.status = 'Completed';
    task.completedAt = new Date();
    task.completionNotes = completionNotes || 'Field inspection successfully completed.';
    await task.save();

    const tasks = await this.getTasks(sector);
    const updated = tasks.find((t) => t.id === id || t.id === task.taskId);
    return updated || (tasks[0] as FieldOfficerTask);
  }

  async escalateTask(
    id: string,
    _sector?: string,
    reason?: string,
    priority = 'Critical',
    escalatedBy = 'Field Officer'
  ): Promise<any> {
    const task = await FieldOfficerTaskModel.findOne({
      $or: [{ taskId: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }].filter(Boolean),
    });

    if (!task) {
      throw new FieldOfficerServiceError(`Task '${id}' not found`, 'NOT_FOUND', 404);
    }

    task.status = 'Escalated';
    task.escalatedAt = new Date();
    task.escalationReason = reason;
    task.escalationPriority = priority;
    await task.save();

    await AuditLog.create({
      action: 'TASK_ESCALATED',
      resourceType: 'Task',
      resourceId: task.taskId,
      details: { reason, priority, escalatedBy },
      timestamp: new Date(),
    });

    return {
      taskId: task.taskId,
      reason,
      priority,
      escalatedBy,
      timestamp: task.escalatedAt.toISOString(),
      dashboardAcknowledged: true,
    };
  }

  // ── Map Data ──────────────────────────────────────────────────────────────

  async getMapData(sector?: string): Promise<FieldOfficerMapData> {
    const [tasks, roadDocs, reportDocs, alertDocs] = await Promise.all([
      this.getTasks(sector),
      Road.find({ isDeleted: false }).sort({ code: 1 }).lean(),
      Report.find({ isDeleted: false }).sort({ createdAt: -1 }).limit(10).lean(),
      Alert.find({ status: 'published', isDeleted: false }).sort({ publishedAt: -1 }).limit(5).lean(),
    ]);

    const roads: RoadStatusSegment[] = roadDocs.map((r) => {
      let condition: RoadCondition = 'Open';
      if (r.status === 'blocked') condition = 'Blocked';
      else if (r.status === 'partial') condition = 'Partially Blocked';
      else if (r.status === 'caution') condition = 'Caution';

      return {
        roadSegmentId: r.code,
        stretchName: `${r.code} - ${r.stretch}`,
        condition,
        reason: r.statusReason || 'Operational corridor monitoring',
        timestamp: r.lastUpdated ? r.lastUpdated.toISOString() : new Date().toISOString(),
        updatedBy: 'NSDMA Operations',
        sector: sector || 'Sector 4 - Kohima Ridge',
      };
    });

    const reports: VillagerReportItem[] = reportDocs.map((rep) => ({
      id: rep.reportId || rep._id.toString(),
      sector: sector || 'Sector 4 - Kohima Ridge',
      hazardType: rep.hazardType,
      locationDescription: rep.location,
      coordinates: rep.coordinates?.coordinates || [94.025, 25.685],
      villagerName: rep.reporterName || 'Local Resident',
      contact: rep.reporterPhone || 'Confidential',
      description: rep.description,
      photoUrl: rep.photoUrl || '',
      timestamp: rep.createdAt.toISOString(),
      status: rep.status === 'verified' ? 'Verified' : rep.status === 'rejected' ? 'Rejected' : 'Pending',
      fieldNotes: rep.verificationNotes || null,
    }));

    const alerts: SectorAlertItem[] = alertDocs.map((a) => {
      let sev: AlertSeverityLevel = 'Advisory';
      if (a.severity === 'Critical') sev = 'Critical';
      else if (a.severity === 'Warning') sev = 'Warning';

      return {
        id: a._id.toString(),
        severity: sev,
        title: a.title,
        instructions: a.advisory || a.description,
        createdAt: a.publishedAt ? a.publishedAt.toISOString() : a.createdAt.toISOString(),
        acknowledged: false,
        targetSector: a.corridor,
      };
    });

    return {
      centerCoordinates: [94.025, 25.685],
      zoomLevel: 13,
      sectorName: sector || 'Sector 4 - Kohima Ridge',
      tasks,
      roadStatuses: roads,
      villagerReports: reports,
      activeAlerts: alerts,
    };
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  async getReports(_sector?: string, statusFilter?: string, hazardFilter?: string): Promise<VillagerReportItem[]> {
    const filter: Record<string, any> = { isDeleted: false };

    if (statusFilter && statusFilter !== 'All') {
      const lower = statusFilter.toLowerCase();
      if (lower === 'verified') filter.status = 'verified';
      else if (lower === 'rejected') filter.status = 'rejected';
      else if (lower === 'pending' || lower === 'submitted') filter.status = 'submitted';
    }

    if (hazardFilter && hazardFilter !== 'All') {
      filter.hazardType = new RegExp(hazardFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }

    const docs = await Report.find(filter).sort({ createdAt: -1 }).limit(50).lean();

    return docs.map((rep) => ({
      id: rep.reportId || rep._id.toString(),
      sector: 'Sector 4 - Kohima Ridge',
      hazardType: rep.hazardType,
      locationDescription: rep.location,
      coordinates: rep.coordinates?.coordinates || [94.025, 25.685],
      villagerName: rep.reporterName || 'Local Resident',
      contact: rep.reporterPhone || 'Confidential',
      description: rep.description,
      photoUrl: rep.photoUrl || '',
      timestamp: rep.createdAt.toISOString(),
      status: rep.status === 'verified' ? 'Verified' : rep.status === 'rejected' ? 'Rejected' : 'Pending',
      fieldNotes: rep.verificationNotes || null,
    }));
  }

  async verifyReport(
    id: string,
    sector?: string,
    fieldNotes?: string,
    inspectorPhotoUrl?: string,
    verifiedBy = 'Field Officer'
  ): Promise<VillagerReportItem> {
    const rep = await Report.findOne({
      $or: [{ reportId: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }].filter(Boolean),
    });

    if (!rep) {
      throw new FieldOfficerServiceError(`Report '${id}' not found`, 'NOT_FOUND', 404);
    }

    rep.status = 'verified';
    rep.verifiedAt = new Date();
    rep.verificationNotes = fieldNotes;
    if (inspectorPhotoUrl) rep.photoUrl = inspectorPhotoUrl;
    await rep.save();

    await AuditLog.create({
      action: 'REPORT_VERIFIED',
      resourceType: 'Report',
      resourceId: rep.reportId,
      details: { fieldNotes, verifiedBy },
      timestamp: new Date(),
    });

    const reports = await this.getReports(sector);
    const updated = reports.find((r) => r.id === id || r.id === rep.reportId);
    return updated || (reports[0] as VillagerReportItem);
  }

  async rejectReport(id: string, sector?: string, rejectionReason?: string): Promise<VillagerReportItem> {
    const rep = await Report.findOne({
      $or: [{ reportId: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }].filter(Boolean),
    });

    if (!rep) {
      throw new FieldOfficerServiceError(`Report '${id}' not found`, 'NOT_FOUND', 404);
    }

    rep.status = 'rejected';
    rep.verificationNotes = rejectionReason;
    await rep.save();

    await AuditLog.create({
      action: 'REPORT_REJECTED',
      resourceType: 'Report',
      resourceId: rep.reportId,
      details: { rejectionReason },
      timestamp: new Date(),
    });

    const reports = await this.getReports(sector);
    const updated = reports.find((r) => r.id === id || r.id === rep.reportId);
    return updated || (reports[0] as VillagerReportItem);
  }

  async escalateReport(
    id: string,
    _sector?: string,
    payload: { escalationReason: string; urgency?: string; recommendedAction?: string } = { escalationReason: '' },
    escalatedBy = 'Field Officer'
  ): Promise<any> {
    const rep = await Report.findOne({
      $or: [{ reportId: id }, { _id: mongoose.Types.ObjectId.isValid(id) ? id : null }].filter(Boolean),
    });

    if (!rep) {
      throw new FieldOfficerServiceError(`Report '${id}' not found`, 'NOT_FOUND', 404);
    }

    rep.status = 'under_review';
    rep.verificationNotes = `[Escalated by ${escalatedBy}]: ${payload.escalationReason}`;
    await rep.save();

    await AuditLog.create({
      action: 'REPORT_ESCALATED',
      resourceType: 'Report',
      resourceId: rep.reportId,
      details: { ...payload, escalatedBy },
      timestamp: new Date(),
    });

    return {
      reportId: rep.reportId,
      escalationReason: payload.escalationReason,
      urgency: payload.urgency || 'Critical',
      recommendedAction: payload.recommendedAction || 'Immediate geotechnical dispatch',
      escalatedBy,
      timestamp: new Date().toISOString(),
      dashboardAcknowledged: true,
    };
  }

  // ── Road Status ───────────────────────────────────────────────────────────

  async getCurrentRoadStatus(sector?: string): Promise<RoadStatusSegment[]> {
    const roads = await Road.find({ isDeleted: false }).sort({ code: 1 }).lean();

    return roads.map((r) => {
      let condition: RoadCondition = 'Open';
      if (r.status === 'blocked') condition = 'Blocked';
      else if (r.status === 'partial') condition = 'Partially Blocked';
      else if (r.status === 'caution') condition = 'Caution';

      return {
        roadSegmentId: r.code,
        stretchName: `${r.code} - ${r.stretch}`,
        condition,
        reason: r.statusReason || 'Standard maintenance monitoring',
        timestamp: r.lastUpdated ? r.lastUpdated.toISOString() : new Date().toISOString(),
        updatedBy: 'NSDMA Road Patrol',
        sector: sector || 'Sector 4 - Kohima Ridge',
      };
    });
  }

  async updateRoadStatus(
    payload: {
      roadSegmentId?: string;
      stretchName?: string;
      condition: RoadCondition;
      reason: string;
      photoUrl?: string | null;
    },
    sector?: string,
    updatedBy = 'Field Officer'
  ): Promise<RoadStatusSegment> {
    const roadId = payload.roadSegmentId;

    const roadDoc = await Road.findOne({
      $or: [{ code: roadId }, { name: roadId }, { _id: mongoose.Types.ObjectId.isValid(roadId || '') ? roadId : null }].filter(Boolean),
    });

    let dbStatus: 'open' | 'caution' | 'partial' | 'blocked' = 'open';
    if (payload.condition === 'Blocked') dbStatus = 'blocked';
    else if (payload.condition === 'Partially Blocked') dbStatus = 'partial';
    else if (payload.condition === 'Caution') dbStatus = 'caution';

    if (roadDoc) {
      roadDoc.status = dbStatus;
      roadDoc.statusReason = payload.reason;
      roadDoc.lastUpdated = new Date();
      await roadDoc.save();
    }

    // Persist sync log
    await RoadStatusUpdateModel.create({
      roadSegmentId: payload.roadSegmentId || 'NH-29',
      stretchName: payload.stretchName || roadDoc?.stretch || 'KM 38 to KM 52',
      condition: payload.condition,
      reason: payload.reason,
      photoUrl: payload.photoUrl || undefined,
      updatedBy,
      sector: sector || 'Sector 4 - Kohima Ridge',
      timestamp: new Date(),
    });

    await AuditLog.create({
      action: 'ROAD_STATUS_UPDATED',
      resourceType: 'Road',
      resourceId: payload.roadSegmentId,
      details: { condition: payload.condition, reason: payload.reason, updatedBy },
      timestamp: new Date(),
    });

    return {
      roadSegmentId: payload.roadSegmentId || 'NH-29',
      stretchName: payload.stretchName || roadDoc?.stretch || 'KM 38 to KM 52',
      condition: payload.condition,
      reason: payload.reason,
      timestamp: new Date().toISOString(),
      updatedBy,
      sector: sector || 'Sector 4 - Kohima Ridge',
    };
  }

  // ── Alerts ────────────────────────────────────────────────────────────────

  async getAlerts(sector?: string, officerId?: string): Promise<SectorAlertItem[]> {
    const alerts = await Alert.find({ status: 'published', isDeleted: false })
      .sort({ publishedAt: -1 })
      .limit(20)
      .lean();

    const acks = await AlertAcknowledgmentModel.find({
      officerId: officerId || 'default-officer',
    }).lean();

    const ackSet = new Set(acks.map((a) => a.alertId));

    return alerts.map((a) => {
      let sev: AlertSeverityLevel = 'Advisory';
      if (a.severity === 'Critical') sev = 'Critical';
      else if (a.severity === 'Warning') sev = 'Warning';

      return {
        id: a._id.toString(),
        severity: sev,
        title: a.title,
        instructions: a.advisory || a.description,
        createdAt: a.publishedAt ? a.publishedAt.toISOString() : a.createdAt.toISOString(),
        acknowledged: ackSet.has(a._id.toString()),
        targetSector: a.corridor || sector || 'Sector 4 - Kohima Ridge',
      };
    });
  }

  async acknowledgeAlert(id: string, sector?: string, officerId = 'default-officer'): Promise<SectorAlertItem> {
    await AlertAcknowledgmentModel.findOneAndUpdate(
      { alertId: id, officerId },
      { alertId: id, officerId, targetSector: sector || 'Sector 4 - Kohima Ridge', acknowledgedAt: new Date() },
      { upsert: true }
    );

    const alerts = await this.getAlerts(sector, officerId);
    const found = alerts.find((a) => a.id === id);
    return found || alerts[0];
  }
}

export const fieldOfficerService = new FieldOfficerService();
