/**
 * Terra360 Field Officer Portal Controller (TypeScript)
 * Canonical API Controller backed by MongoDB persistence.
 */

import { Request, Response, NextFunction } from 'express';
import { fieldOfficerService } from './fieldOfficer.service';

export class FieldOfficerController {
  private getOfficerDetails(req: Request) {
    const user = req.user;
    const headerSector = req.headers['x-officer-sector'] as string | undefined;

    return {
      id: user?.id || (user as any)?._id?.toString() || 'usr-fo-default',
      name: user?.name || 'Temsu Jamir',
      department: user?.department || 'Nagaland State Disaster Management Authority (NSDMA)',
      assignedArea: headerSector || user?.assignedArea || 'Sector 4 - Kohima Ridge',
      phone: user?.phone || '+91 98765 00003',
      language: user?.language || 'en',
      badgeNumber: 'FO-NL-408',
    };
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const officer = this.getOfficerDetails(req);
      const profile = await fieldOfficerService.getProfile(officer.id, officer.assignedArea);

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  };

  updateLanguage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { language } = req.body;
      const officer = this.getOfficerDetails(req);
      const updatedProfile = await fieldOfficerService.updateLanguage(officer.id, language);

      res.status(200).json({
        success: true,
        message: `Language updated to '${updatedProfile.language}'`,
        data: updatedProfile,
      });
    } catch (error) {
      next(error);
    }
  };

  // ── Tasks ─────────────────────────────────────────────────────────────────

  getTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const officer = this.getOfficerDetails(req);
      const { status, riskLevel } = req.query as { status?: string; riskLevel?: string };

      const tasks = await fieldOfficerService.getTasks(officer.assignedArea, status, riskLevel);

      res.status(200).json({
        success: true,
        count: tasks.length,
        data: tasks,
      });
    } catch (error) {
      next(error);
    }
  };

  startTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const officer = this.getOfficerDetails(req);

      const task = await fieldOfficerService.startTask(id, officer.assignedArea);

      res.status(200).json({
        success: true,
        message: `Task '${id}' started. Inspection timer activated.`,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  };

  completeTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { completionNotes } = req.body;
      const officer = this.getOfficerDetails(req);

      const task = await fieldOfficerService.completeTask(id, officer.assignedArea, completionNotes);

      res.status(200).json({
        success: true,
        message: `Task '${id}' marked as Completed.`,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  };

  escalateTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { reason, priority } = req.body;
      const officer = this.getOfficerDetails(req);

      const result = await fieldOfficerService.escalateTask(
        id,
        officer.assignedArea,
        reason,
        priority,
        `${officer.name} (${officer.badgeNumber || 'Officer'})`
      );

      res.status(200).json({
        success: true,
        message: `Task '${id}' escalated to central disaster officer dashboard.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // ── Map Data ──────────────────────────────────────────────────────────────

  getMapData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const officer = this.getOfficerDetails(req);
      const mapData = await fieldOfficerService.getMapData(officer.assignedArea);

      res.status(200).json({
        success: true,
        data: mapData,
      });
    } catch (error) {
      next(error);
    }
  };

  // ── Reports ───────────────────────────────────────────────────────────────

  getReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const officer = this.getOfficerDetails(req);
      const { status, hazardType } = req.query as { status?: string; hazardType?: string };

      const reports = await fieldOfficerService.getReports(officer.assignedArea, status, hazardType);

      res.status(200).json({
        success: true,
        count: reports.length,
        data: reports,
      });
    } catch (error) {
      next(error);
    }
  };

  verifyReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { fieldNotes, inspectorPhotoUrl } = req.body;
      const officer = this.getOfficerDetails(req);

      const report = await fieldOfficerService.verifyReport(
        id,
        officer.assignedArea,
        fieldNotes,
        inspectorPhotoUrl,
        `${officer.name} (${officer.badgeNumber || 'Officer'})`
      );

      res.status(200).json({
        success: true,
        message: `Report '${id}' successfully verified.`,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  };

  rejectReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      const officer = this.getOfficerDetails(req);

      const report = await fieldOfficerService.rejectReport(
        id,
        officer.assignedArea,
        rejectionReason
      );

      res.status(200).json({
        success: true,
        message: `Report '${id}' rejected.`,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  };

  escalateReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { escalationReason, urgency, recommendedAction } = req.body;
      const officer = this.getOfficerDetails(req);

      const result = await fieldOfficerService.escalateReport(
        id,
        officer.assignedArea,
        { escalationReason, urgency, recommendedAction },
        `${officer.name} (${officer.badgeNumber || 'Officer'})`
      );

      res.status(200).json({
        success: true,
        message: `Report '${id}' escalated to emergency response team.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // ── Road Status ───────────────────────────────────────────────────────────

  getCurrentRoadStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const officer = this.getOfficerDetails(req);
      const roadStatuses = await fieldOfficerService.getCurrentRoadStatus(officer.assignedArea);

      res.status(200).json({
        success: true,
        count: roadStatuses.length,
        data: roadStatuses,
      });
    } catch (error) {
      next(error);
    }
  };

  updateRoadStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const officer = this.getOfficerDetails(req);
      const updatedStatus = await fieldOfficerService.updateRoadStatus(
        req.body,
        officer.assignedArea,
        `${officer.name} (${officer.badgeNumber || 'Officer'})`
      );

      res.status(200).json({
        success: true,
        message: `Road segment status updated and synchronized with live highway telemetry.`,
        data: updatedStatus,
      });
    } catch (error) {
      next(error);
    }
  };

  // ── Alerts ────────────────────────────────────────────────────────────────

  getAlerts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const officer = this.getOfficerDetails(req);
      const alerts = await fieldOfficerService.getAlerts(officer.assignedArea, officer.id);

      res.status(200).json({
        success: true,
        count: alerts.length,
        data: alerts,
      });
    } catch (error) {
      next(error);
    }
  };

  acknowledgeAlert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const officer = this.getOfficerDetails(req);
      const alert = await fieldOfficerService.acknowledgeAlert(id, officer.assignedArea, officer.id);

      res.status(200).json({
        success: true,
        message: `Alert '${id}' acknowledged.`,
        data: alert,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const fieldOfficerController = new FieldOfficerController();
