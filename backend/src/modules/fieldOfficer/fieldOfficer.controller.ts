/**
 * Terra360 Field Officer Portal Controller (TypeScript)
 */

import { Request, Response, NextFunction } from 'express';
import { fieldOfficerService, FieldOfficerServiceError } from './fieldOfficer.service';

export class FieldOfficerController {
  private getOfficerDetails(req: Request) {
    const user = req.user;
    const headerId = req.headers['x-officer-id'] as string | undefined;
    const headerSector = req.headers['x-officer-sector'] as string | undefined;

    const profile = fieldOfficerService.getProfile(headerId, headerSector);

    return {
      id: user?.id || profile.id,
      name: user?.name || profile.name,
      department: user?.department || profile.department,
      assignedArea: headerSector || user?.assignedArea || profile.assignedArea,
      phone: user?.phone || profile.phone,
      language: user?.language || profile.language,
      badgeNumber: profile.badgeNumber,
    };
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const officer = this.getOfficerDetails(req);
      const profile = fieldOfficerService.getProfile(officer.id, officer.assignedArea);

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
      const updatedProfile = fieldOfficerService.updateLanguage(language);

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

      const tasks = fieldOfficerService.getTasks(officer.assignedArea, status, riskLevel);

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

      const task = fieldOfficerService.startTask(id, officer.assignedArea);

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

      const task = fieldOfficerService.completeTask(id, officer.assignedArea, completionNotes);

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

      const result = fieldOfficerService.escalateTask(
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
      const mapData = fieldOfficerService.getMapData(officer.assignedArea);

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

      const reports = fieldOfficerService.getReports(officer.assignedArea, status, hazardType);

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

      const report = fieldOfficerService.verifyReport(
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

      const report = fieldOfficerService.rejectReport(
        id,
        officer.assignedArea,
        rejectionReason,
        `${officer.name} (${officer.badgeNumber || 'Officer'})`
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
      const { urgency, escalationReason, recommendedAction } = req.body;
      const officer = this.getOfficerDetails(req);

      const result = fieldOfficerService.escalateReport(
        id,
        officer.assignedArea,
        escalationReason,
        urgency,
        recommendedAction,
        `${officer.name} (${officer.badgeNumber || 'Officer'})`
      );

      res.status(200).json({
        success: true,
        message: `Report '${id}' escalated to high command.`,
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
      const roads = fieldOfficerService.getCurrentRoadStatus(officer.assignedArea);

      res.status(200).json({
        success: true,
        sector: officer.assignedArea,
        count: roads.length,
        data: roads,
      });
    } catch (error) {
      next(error);
    }
  };

  updateRoadStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { roadSegmentId, stretchName, condition, reason, photoUrl, timestamp } = req.body;
      const officer = this.getOfficerDetails(req);

      const result = fieldOfficerService.updateRoadStatus(
        officer.assignedArea,
        roadSegmentId,
        stretchName,
        condition,
        reason,
        photoUrl,
        timestamp,
        `${officer.name} (${officer.badgeNumber || 'Officer'})`
      );

      res.status(200).json({
        success: true,
        message: `Road status updated and synced to central disaster officer dashboard.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // ── Sector Alerts ─────────────────────────────────────────────────────────

  getAlerts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const officer = this.getOfficerDetails(req);
      const alerts = fieldOfficerService.getAlerts(officer.assignedArea);

      res.status(200).json({
        success: true,
        sector: officer.assignedArea,
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

      const alert = fieldOfficerService.acknowledgeAlert(id, officer.assignedArea, officer.id);

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

