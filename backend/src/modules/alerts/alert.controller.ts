import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { alertService } from './alert.service';

export class AlertController {
  async createDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const officerId = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined;
      const alert = await alertService.createDraft(req.body, officerId);
      res.status(201).json({
        success: true,
        message: 'Alert draft created successfully.',
        data: alert,
      });
    } catch (error) {
      next(error);
    }
  }

  async listAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await alertService.listAlerts(req.query as any);
      res.status(200).json({
        success: true,
        data: result.alerts,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getAlertById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const alert = await alertService.getAlertById(req.params.id);
      res.status(200).json({
        success: true,
        data: alert,
      });
    } catch (error) {
      next(error);
    }
  }

  async previewAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await alertService.previewAlert(req.params.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async approveAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { confirm } = req.body || {};
      const officerId = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined;
      const officerEmail = req.user?.email;

      const result = await alertService.approveAlert(
        req.params.id,
        confirm,
        officerId,
        officerEmail
      );

      res.status(200).json({
        success: true,
        message: 'Alert approved and delivery queued across selected channels.',
        data: {
          _id: result.alert._id,
          status: result.alert.status,
          publishedAt: result.alert.publishedAt,
          queuedRecipients: result.queuedRecipients,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reason } = req.body || {};
      const officerId = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined;
      const alert = await alertService.cancelAlert(req.params.id, reason, officerId);

      res.status(200).json({
        success: true,
        message: 'Alert cancelled.',
        data: alert,
      });
    } catch (error) {
      next(error);
    }
  }

  async getDeliveries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await alertService.getDeliveries(req.params.id);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async retryFailedDeliveries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await alertService.retryFailedDeliveries(req.params.id);
      res.status(200).json({
        success: true,
        message: `Retry scheduled for ${data.retriedCount} deliveries.`,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const alertController = new AlertController();
