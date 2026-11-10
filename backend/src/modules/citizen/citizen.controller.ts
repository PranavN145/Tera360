import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { citizenService } from './citizen.service';

export class CitizenController {
  async getArea(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await citizenService.getAreaInfo(req.user as any);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAreaMap(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await citizenService.getAreaMap(req.user as any);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSafePlace(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await citizenService.getSafePlace(req.user as any);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  async submitCheckIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const checkIn = await citizenService.submitCheckIn(req.user as any, req.body);
      res.status(201).json({
        success: true,
        message: 'Safety check-in successfully recorded and family contacts notified.',
        data: checkIn,
      });
    } catch (error) {
      next(error);
    }
  }

  async listCheckIns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = new mongoose.Types.ObjectId(req.user!.id);
      const checkIns = await citizenService.listCheckIns(userId);
      res.status(200).json({
        success: true,
        count: checkIns.length,
        data: checkIns,
      });
    } catch (error) {
      next(error);
    }
  }

  async getOfflineBundle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bundle = await citizenService.getOfflineBundle(req.user as any);
      res.status(200).json({
        success: true,
        data: bundle,
      });
    } catch (error) {
      next(error);
    }
  }

  async listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = new mongoose.Types.ObjectId(req.user!.id);
      const notifications = await citizenService.listNotifications(
        userId,
        req.user?.role
      );
      res.status(200).json({
        success: true,
        count: notifications.length,
        data: notifications,
      });
    } catch (error) {
      next(error);
    }
  }

  async markNotificationRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = new mongoose.Types.ObjectId(req.user!.id);
      await citizenService.markNotificationRead(req.params.id, userId);
      res.status(200).json({
        success: true,
        message: 'Notification marked as read.',
      });
    } catch (error) {
      next(error);
    }
  }

  async markAllNotificationsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = new mongoose.Types.ObjectId(req.user!.id);
      await citizenService.markAllNotificationsRead(userId);
      res.status(200).json({
        success: true,
        message: 'All notifications marked as read.',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const citizenController = new CitizenController();
