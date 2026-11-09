import crypto from 'crypto';
import mongoose from 'mongoose';
import { Report, IReportLocationPoint } from './report.model';
import { CreatePublicReportInput } from './report.schema';
import { captchaService } from '../../services/captcha.service';

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
      filter.state = new RegExp(`^${query.state.trim()}$`, 'i');
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
}

export const reportService = new ReportService();

