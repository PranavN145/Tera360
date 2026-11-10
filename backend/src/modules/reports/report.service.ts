import crypto from 'crypto';
import mongoose from 'mongoose';
import { Report, IReportLocationPoint } from './report.model';
import {
  CreatePublicReportInput,
  CreateAuthenticatedReportInput,
  TriageReportInput,
  AssignTaskInput,
} from './report.schema';
import { FieldOfficerTaskModel } from '../fieldOfficer/fieldOfficer.model';
import { AuditLog } from '../audit/auditLog.model';
import { User } from '../users/user.model';
import { Notification } from '../notifications/notification.model';
import { captchaService } from '../../services/captcha.service';
import { escapeRegex } from '../../utils/crypto';

export interface RequestClientMeta {
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
}

export interface PublicReportOutput {
  reportId: string;
  state: string;
  location: string;
  hazardType: string;
  severity: string;
  description: string;
  reporterName?: string;
  reporterPhone?: string;
  photoUrl?: string;
  coordinates?: IReportLocationPoint;
  status: string;
  source: string;
  createdAt: Date;
}

/**
 * Generate a collision-resistant unique Report ID (e.g. TR-2026-A1B2C3)
 */
async function generateUniqueReportId(): Promise<string> {
  const currentYear = new Date().getFullYear();

  for (let attempt = 0; attempt < 5; attempt++) {
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const candidateId = `TR-${currentYear}-${randomHex}`;

    const exists = await Report.exists({ reportId: candidateId });
    if (!exists) {
      return candidateId;
    }
  }

  // Safe fallback ensuring uniqueness via timestamp and random bytes
  const timestampPart = Date.now().toString(36).toUpperCase();
  const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `TR-${currentYear}-${timestampPart}-${randomSuffix}`;
}

export class ReportService {
  /**
   * Process and persist a public landslide/hazard report.
   * Strictly enforces public safety boundaries and mass-assignment protection.
   */
  async submitPublicReport(
    input: CreatePublicReportInput,
    meta: RequestClientMeta = {}
  ): Promise<PublicReportOutput> {
    // 1. Verify Cloudflare Turnstile CAPTCHA (PRD §13.1, §14.4, §18.2)
    await captchaService.verifyTurnstileToken(input.captchaToken, meta.ipAddress);

    const reportId = await generateUniqueReportId();

    const newReport = new Report({
      reportId,
      state: input.state,
      location: input.location,
      hazardType: input.hazardType,
      severity: input.severity || 'Warning',
      description: input.description,
      reporterName: input.reporterName?.trim() || undefined,
      reporterPhone: input.reporterPhone?.trim() || undefined,
      photoUrl: input.photoUrl?.trim() || undefined,
      coordinates: input.coordinates,
      // Security: hardcoded by server, immune to client manipulation
      status: 'submitted',
      source: meta.userId ? 'citizen' : 'public',
      reporterId: meta.userId ? new mongoose.Types.ObjectId(meta.userId) : undefined,
      isDeleted: false,
      // Abuse prevention audit fields
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    await newReport.save();

    return {
      reportId: newReport.reportId,
      state: newReport.state,
      location: newReport.location,
      hazardType: newReport.hazardType,
      severity: newReport.severity,
      description: newReport.description,
      reporterName: newReport.reporterName,
      reporterPhone: newReport.reporterPhone,
      photoUrl: newReport.photoUrl,
      coordinates: newReport.coordinates,
      status: newReport.status,
      source: newReport.source,
      createdAt: newReport.createdAt,
    };
  }

  /**
   * List hazard reports for operational officers and emergency desks.
   */
  async listReports(query?: {
    state?: string;
    status?: string;
    limit?: number;
  }): Promise<PublicReportOutput[]> {
    const filter: Record<string, any> = { isDeleted: false };
    if (query?.state && query.state !== 'All' && query.state !== 'All States') {
      filter.state = new RegExp(`^${escapeRegex(query.state.trim())}$`, 'i');
    }
    if (query?.status && query.status !== 'All') {
      filter.status = query.status;
    }
    const limit = Math.min(query?.limit || 50, 100);

    const reports = await Report.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return reports.map((r) => ({
      reportId: r.reportId,
      state: r.state,
      location: r.location,
      hazardType: r.hazardType,
      severity: r.severity,
      description: r.description,
      reporterName: r.reporterName,
      reporterPhone: r.reporterPhone,
      photoUrl: r.photoUrl,
      coordinates: r.coordinates,
      status: r.status,
      source: r.source,
      createdAt: r.createdAt,
    }));
  }

  /**
   * List hazard reports submitted by the authenticated citizen.
   * Strictly isolates reports so citizens can only retrieve their own submissions.
   */
  async listMyReports(userId: string): Promise<PublicReportOutput[]> {
    const reports = await Report.find({
      reporterId: new mongoose.Types.ObjectId(userId),
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return reports.map((r) => ({
      reportId: r.reportId,
      state: r.state,
      location: r.location,
      hazardType: r.hazardType,
      severity: r.severity,
      description: r.description,
      reporterName: r.reporterName,
      reporterPhone: r.reporterPhone,
      photoUrl: r.photoUrl,
      coordinates: r.coordinates,
      status: r.status,
      source: r.source,
      createdAt: r.createdAt,
    }));
  }
  /**
   * Submit authenticated hazard report (Citizen / Field Officer).
   * No CAPTCHA required for verified, authenticated users (PRD §14.4).
   */
  async submitAuthenticatedReport(
    input: CreateAuthenticatedReportInput,
    user: any,
    meta: RequestClientMeta = {}
  ): Promise<PublicReportOutput> {
    const reportId = await generateUniqueReportId();

    const newReport = new Report({
      reportId,
      state: input.state,
      location: input.location,
      hazardType: input.hazardType,
      severity: input.severity || 'Warning',
      description: input.description,
      reporterName: input.reporterName?.trim() || user?.name || undefined,
      reporterPhone: input.reporterPhone?.trim() || user?.phone || undefined,
      photoUrl: input.photoUrl?.trim() || undefined,
      coordinates: input.coordinates,
      status: 'submitted',
      source: user?.role === 'field_officer' ? 'field_officer' : 'citizen',
      reporterId: user?._id,
      isDeleted: false,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    await newReport.save();

    await AuditLog.create({
      userId: user?._id,
      userEmail: user?.email,
      role: user?.role || 'citizen',
      action: 'HAZARD_REPORT_SUBMITTED',
      resourceType: 'Report',
      resourceId: newReport.reportId,
      details: { hazardType: newReport.hazardType, severity: newReport.severity, location: newReport.location },
      timestamp: new Date(),
    });

    return {
      reportId: newReport.reportId,
      state: newReport.state,
      location: newReport.location,
      hazardType: newReport.hazardType,
      severity: newReport.severity,
      description: newReport.description,
      reporterName: newReport.reporterName,
      reporterPhone: newReport.reporterPhone,
      photoUrl: newReport.photoUrl,
      coordinates: newReport.coordinates,
      status: newReport.status,
      source: newReport.source,
      createdAt: newReport.createdAt,
    };
  }

  async getReportById(id: string): Promise<any> {
    const report = await Report.findOne({
      $or: [
        { reportId: id },
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
      ].filter(Boolean),
      isDeleted: false,
    }).lean();

    if (!report) {
      throw new Error(`Report '${id}' not found`);
    }

    return report;
  }

  async triageReport(
    id: string,
    payload: TriageReportInput,
    officerUser: any
  ): Promise<any> {
    const report = await Report.findOne({
      $or: [
        { reportId: id },
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
      ].filter(Boolean),
      isDeleted: false,
    });

    if (!report) {
      throw new Error(`Report '${id}' not found`);
    }

    const previousStatus = report.status;
    report.status = payload.status === 'false_alarm' ? 'rejected' : payload.status as any;
    report.verifiedBy = officerUser?._id;
    report.verifiedAt = new Date();
    if (payload.verificationNotes) {
      report.verificationNotes = payload.verificationNotes;
    }
    await report.save();

    await AuditLog.create({
      userId: officerUser?._id,
      userEmail: officerUser?.email,
      role: officerUser?.role || 'officer',
      action: 'REPORT_TRIAGED',
      resourceType: 'Report',
      resourceId: report.reportId,
      details: { previousStatus, newStatus: report.status, notes: payload.verificationNotes },
      timestamp: new Date(),
    });

    return report;
  }

  async assignTask(
    payload: AssignTaskInput,
    officerUser: any
  ): Promise<any> {
    let assignedOfficer: any = null;
    if (payload.assignedTo) {
      assignedOfficer = await User.findOne({
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(payload.assignedTo) ? payload.assignedTo : null },
          { email: payload.assignedTo },
          { name: payload.assignedTo },
        ].filter(Boolean),
      });
    }

    if (!assignedOfficer) {
      assignedOfficer = await User.findOne({ role: 'field_officer' });
    }

    const taskId = `TSK-${Date.now().toString().slice(-4)}`;
    const task = new FieldOfficerTaskModel({
      taskId,
      sector: payload.sector,
      location: {
        type: 'Point',
        coordinates: payload.coordinates || [94.025, 25.685],
        chainageName: payload.chainageName || payload.sector,
      },
      riskLevel: payload.riskLevel || 'High',
      reason: payload.reason,
      deadline: payload.deadline || new Date(Date.now() + 48 * 3600000),
      status: 'Assigned',
      assignedBy: officerUser?.name || 'Disaster Operations Desk',
      assignedTo: assignedOfficer?._id,
      assignedAt: new Date(),
    });

    await task.save();

    if (assignedOfficer) {
      await Notification.create({
        userId: assignedOfficer._id,
        title: `📋 New Task Assigned: ${taskId}`,
        message: `${payload.reason} (${payload.sector})`,
        type: 'task',
        entityId: taskId,
      });
    }

    if (payload.reportId) {
      await Report.findOneAndUpdate(
        { reportId: payload.reportId },
        { status: 'under_review', verificationNotes: `Assigned inspection task ${taskId}` }
      );
    }

    await AuditLog.create({
      userId: officerUser?._id,
      userEmail: officerUser?.email,
      role: officerUser?.role || 'officer',
      action: 'TASK_ASSIGNED',
      resourceType: 'Task',
      resourceId: taskId,
      details: { sector: payload.sector, assignedTo: assignedOfficer?.name, reason: payload.reason },
      timestamp: new Date(),
    });

    return task;
  }
}

export const reportService = new ReportService();

