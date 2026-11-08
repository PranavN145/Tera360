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
}

export const reportController = new ReportController();

