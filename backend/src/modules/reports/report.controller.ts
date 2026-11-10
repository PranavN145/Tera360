import { Request, Response, NextFunction } from 'express';
import { reportService } from './report.service';

export class ReportController {
  async submitPublicReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Use Express's validated req.ip governed by trusted proxy configuration (PRD §13.1, §15)
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'] as string | undefined;

      const report = await reportService.submitPublicReport(req.body, {
        ipAddress,
        userAgent,
        userId: req.user?.id,
      });

      res.status(201).json({
        success: true,
        message: 'Hazard report submitted successfully. Thank you for contributing ground truth.',
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  async submitAuthenticatedReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'] as string | undefined;

      const report = await reportService.submitAuthenticatedReport(req.body, req.user, {
        ipAddress,
        userAgent,
      });

      res.status(201).json({
        success: true,
        message: 'Hazard report submitted successfully. Operations desk notified.',
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  async getReportById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await reportService.getReportById(req.params.id);
      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  async triageReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await reportService.triageReport(req.params.id, req.body, req.user);
      res.status(200).json({
        success: true,
        message: `Report status updated to '${report.status}'.`,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  async assignTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await reportService.assignTask(req.body, req.user);
      res.status(201).json({
        success: true,
        message: `Inspection task '${task.taskId}' assigned to field team.`,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  async listMyReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const reports = await reportService.listMyReports(userId);

      res.status(200).json({
        success: true,
        data: reports,
      });
    } catch (error) {
      next(error);
    }
  }

  async listReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const state = req.query.state as string | undefined;
      const status = req.query.status as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      const reports = await reportService.listReports({ state, status, limit });

      res.status(200).json({
        success: true,
        data: reports,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const reportController = new ReportController();

